import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  scenarios: {
    // Baseline load test
    baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { test_type: 'baseline' },
    },
    
    // Spike test for API endpoints
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up
        { duration: '5m', target: 100 },  // Stay at peak
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'spike' },
    },
    
    // Stress test for high-performance APIs
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 200 },  // Ramp up
        { duration: '10m', target: 200 }, // Stay at stress level
        { duration: '5m', target: 400 },  // Push to breaking point
        { duration: '10m', target: 400 }, // Maintain stress
        { duration: '5m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'stress' },
    },
    
    // Endurance test
    endurance: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m',
      tags: { test_type: 'endurance' },
    },
  },
  
  thresholds: {
    // API Performance thresholds based on Epic 3 targets
    http_req_duration: [
      'p(95)<100',     // 95% of requests under 100ms
      'p(99)<200',     // 99% of requests under 200ms
      'avg<50',        // Average response time under 50ms
    ],
    http_req_failed: ['rate<0.01'], // Error rate under 1%
    
    // High-performance API targets (Epic 3 Story 3)
    'http_reqs{expected_response:true}': ['rate>48000'], // 48k+ RPS target
    
    // Real-time collaboration targets (Epic 3 Story 2)
    'http_req_duration{test_type:baseline}': ['p(95)<150'], // Real-time latency
    
    // Data visualization targets (Epic 3 Story 4)
    'http_req_duration{endpoint:streaming}': ['p(95)<100'], // Streaming latency
  },
};

// Test data
const testData = {
  users: generateTestUsers(1000),
  datasets: generateTestDatasets(100),
  chartConfigs: generateChartConfigs(50),
};

// Base URLs for different template types
const baseUrls = {
  api: __ENV.API_BASE_URL || 'http://localhost:3000',
  collaboration: __ENV.COLLAB_BASE_URL || 'http://localhost:8080',
  visualization: __ENV.VIZ_BASE_URL || 'http://localhost:5173',
};

export default function () {
  const testType = __ENV.TEST_TYPE || 'all';
  
  switch (testType) {
    case 'api':
      testHighPerformanceAPI();
      break;
    case 'collaboration':
      testRealTimeCollaboration();
      break;
    case 'visualization':
      testDataVisualization();
      break;
    case 'mobile':
      testMobilePerformance();
      break;
    default:
      // Run comprehensive test suite
      testHighPerformanceAPI();
      testRealTimeCollaboration();
      testDataVisualization();
      break;
  }
  
  sleep(1);
}

function testHighPerformanceAPI() {
  const baseUrl = baseUrls.api;
  
  // Test Epic 3 Story 3 - High-Performance API Platform
  group('High-Performance API Tests', () => {
    // Health check
    let response = http.get(`${baseUrl}/health`);
    check(response, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 10ms': (r) => r.timings.duration < 10,
    });
    
    // User CRUD operations
    const userData = testData.users[Math.floor(Math.random() * testData.users.length)];
    
    response = http.post(`${baseUrl}/api/v1/users`, JSON.stringify(userData), {
      headers: { 'Content-Type': 'application/json' },
    });
    check(response, {
      'user creation status is 201': (r) => r.status === 201,
      'user creation response time < 50ms': (r) => r.timings.duration < 50,
    });
    
    if (response.status === 201) {
      const userId = JSON.parse(response.body).id;
      
      // Get user
      response = http.get(`${baseUrl}/api/v1/users/${userId}`);
      check(response, {
        'user retrieval status is 200': (r) => r.status === 200,
        'user retrieval response time < 25ms': (r) => r.timings.duration < 25,
      });
      
      // Update user
      response = http.put(`${baseUrl}/api/v1/users/${userId}`, 
        JSON.stringify({ ...userData, updated: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
      check(response, {
        'user update status is 200': (r) => r.status === 200,
        'user update response time < 50ms': (r) => r.timings.duration < 50,
      });
      
      // Delete user
      response = http.del(`${baseUrl}/api/v1/users/${userId}`);
      check(response, {
        'user deletion status is 204': (r) => r.status === 204,
        'user deletion response time < 25ms': (r) => r.timings.duration < 25,
      });
    }
    
    // GraphQL endpoint test
    const graphqlQuery = {
      query: `
        query GetUsers($limit: Int) {
          users(limit: $limit) {
            id
            email
            fullName
            isActive
          }
        }
      `,
      variables: { limit: 10 }
    };
    
    response = http.post(`${baseUrl}/graphql`, JSON.stringify(graphqlQuery), {
      headers: { 'Content-Type': 'application/json' },
    });
    check(response, {
      'GraphQL query status is 200': (r) => r.status === 200,
      'GraphQL query response time < 100ms': (r) => r.timings.duration < 100,
      'GraphQL response has data': (r) => JSON.parse(r.body).data !== undefined,
    });
    
    // Metrics tracking
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
    requestCount.add(1);
  });
}

function testRealTimeCollaboration() {
  const baseUrl = baseUrls.collaboration;
  
  // Test Epic 3 Story 2 - Real-time Collaboration Platform
  group('Real-time Collaboration Tests', () => {
    // WebRTC connection simulation
    let response = http.post(`${baseUrl}/api/rooms`, JSON.stringify({
      name: `test-room-${Date.now()}`,
      maxUsers: 10
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(response, {
      'room creation status is 201': (r) => r.status === 201,
      'room creation response time < 100ms': (r) => r.timings.duration < 100,
    });
    
    if (response.status === 201) {
      const roomId = JSON.parse(response.body).id;
      
      // Join room
      response = http.post(`${baseUrl}/api/rooms/${roomId}/join`, JSON.stringify({
        userId: `user-${Date.now()}`,
        userName: 'Test User'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(response, {
        'room join status is 200': (r) => r.status === 200,
        'room join response time < 150ms': (r) => r.timings.duration < 150,
      });
      
      // Operational transform test
      response = http.post(`${baseUrl}/api/rooms/${roomId}/operations`, JSON.stringify({
        type: 'insert',
        position: 0,
        content: 'Hello, World!',
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(response, {
        'operation status is 200': (r) => r.status === 200,
        'operation response time < 50ms': (r) => r.timings.duration < 50,
      });
    }
  });
}

function testDataVisualization() {
  const baseUrl = baseUrls.visualization;
  
  // Test Epic 3 Story 4 - Data Visualization Dashboard Platform
  group('Data Visualization Tests', () => {
    // Large dataset upload simulation
    const largeDataset = generateLargeDataset(100000); // 100k points
    
    let response = http.post(`${baseUrl}/api/datasets`, JSON.stringify({
      name: 'Performance Test Dataset',
      data: largeDataset.slice(0, 1000), // Send sample for upload test
      size: largeDataset.length
    }), {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s'
    });
    
    check(response, {
      'dataset upload status is 201': (r) => r.status === 201,
      'dataset upload response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    // Chart rendering performance
    response = http.post(`${baseUrl}/api/charts/render`, JSON.stringify({
      type: 'scatter',
      dataSize: 100000,
      config: testData.chartConfigs[0]
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(response, {
      'chart render status is 200': (r) => r.status === 200,
      'chart render response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    // Streaming data endpoint
    response = http.get(`${baseUrl}/api/stream/health`);
    check(response, {
      'streaming health status is 200': (r) => r.status === 200,
      'streaming health response time < 100ms': (r) => r.timings.duration < 100,
    });
  });
}

function testMobilePerformance() {
  // Mobile-specific API tests for React Native and Flutter templates
  group('Mobile Performance Tests', () => {
    const mobileEndpoints = [
      '/api/mobile/ai/chat',
      '/api/mobile/voice/process',
      '/api/mobile/camera/analyze',
      '/api/mobile/sync'
    ];
    
    mobileEndpoints.forEach(endpoint => {
      const response = http.get(`${baseUrls.api}${endpoint}`);
      check(response, {
        [`${endpoint} mobile response time < 500ms`]: (r) => r.timings.duration < 500,
        [`${endpoint} mobile status is valid`]: (r) => r.status >= 200 && r.status < 500,
      });
    });
  });
}

// Helper functions
function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      email: `test${i}@example.com`,
      fullName: `Test User ${i}`,
      isActive: Math.random() > 0.1,
      metadata: {
        testId: i,
        createdAt: new Date().toISOString()
      }
    });
  }
  return users;
}

function generateTestDatasets(count) {
  const datasets = [];
  for (let i = 0; i < count; i++) {
    datasets.push({
      id: `dataset-${i}`,
      name: `Test Dataset ${i}`,
      size: Math.floor(Math.random() * 1000000) + 1000,
      format: ['csv', 'json', 'parquet'][Math.floor(Math.random() * 3)]
    });
  }
  return datasets;
}

function generateChartConfigs(count) {
  const configs = [];
  const types = ['scatter', 'line', 'bar', 'heatmap', '3d-scatter'];
  
  for (let i = 0; i < count; i++) {
    configs.push({
      type: types[Math.floor(Math.random() * types.length)],
      width: 800 + Math.floor(Math.random() * 400),
      height: 600 + Math.floor(Math.random() * 400),
      rendering: {
        webgl: Math.random() > 0.5,
        gpu: Math.random() > 0.3,
        antialiasing: Math.random() > 0.2
      }
    });
  }
  return configs;
}

function generateLargeDataset(size) {
  const data = [];
  for (let i = 0; i < size; i++) {
    data.push({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 100,
      value: Math.random(),
      timestamp: Date.now() + i
    });
  }
  return data;
}

// Report generation
export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data),
    'summary.json': JSON.stringify(data, null, 2),
  };
}