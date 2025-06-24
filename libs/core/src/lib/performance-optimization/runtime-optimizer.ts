/**
 * @fileoverview Runtime Performance Optimizer - Epic 6 Story 5 AC2
 * Runtime optimization with lazy loading, virtualization, and performance patterns
 */

import { EventEmitter } from 'events';
import { SupportedFramework } from '../types';

/**
 * Runtime optimization techniques
 */
export enum RuntimeOptimizationTechnique {
  LAZY_LOADING = 'lazy_loading',
  VIRTUALIZATION = 'virtualization',
  MEMOIZATION = 'memoization',
  DEBOUNCING = 'debouncing',
  THROTTLING = 'throttling',
  REQUEST_BATCHING = 'request_batching',
  PREFETCHING = 'prefetching',
  SERVICE_WORKER = 'service_worker',
  WEB_WORKERS = 'web_workers',
  INTERSECTION_OBSERVER = 'intersection_observer',
  REQUEST_IDLE_CALLBACK = 'request_idle_callback',
  PROGRESSIVE_ENHANCEMENT = 'progressive_enhancement'
}

/**
 * Runtime performance metrics
 */
export interface RuntimeMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  speedIndex: number;
  
  // Memory metrics
  jsHeapUsed: number;
  jsHeapTotal: number;
  domNodes: number;
  layoutsPerSecond: number;
  recalcStylesPerSecond: number;
  
  // Network metrics
  requestCount: number;
  requestSize: number;
  responseTime: number;
  cacheHitRate: number;
}

/**
 * Runtime optimization configuration
 */
export interface RuntimeOptimizationConfig {
  // Performance targets
  targetFCP: number; // First Contentful Paint (ms)
  targetLCP: number; // Largest Contentful Paint (ms)
  targetFID: number; // First Input Delay (ms)
  targetCLS: number; // Cumulative Layout Shift
  targetTTI: number; // Time to Interactive (ms)
  
  // Optimization techniques
  enabledTechniques: RuntimeOptimizationTechnique[];
  
  // Lazy loading configuration
  lazyLoading: LazyLoadingConfig;
  
  // Virtualization configuration
  virtualization: VirtualizationConfig;
  
  // Caching configuration
  caching: CachingConfig;
  
  // Performance monitoring
  monitoring: PerformanceMonitoringConfig;
  
  // Framework-specific optimizations
  frameworkOptimizations: Map<SupportedFramework, FrameworkRuntimeConfig>;
}

/**
 * Lazy loading configuration
 */
export interface LazyLoadingConfig {
  // Route-based lazy loading
  routeLazyLoading: boolean;
  routePreloading: 'none' | 'all' | 'selective';
  routePrefetchDelay: number;
  
  // Component lazy loading
  componentLazyLoading: boolean;
  componentVisibilityThreshold: number;
  componentRootMargin: string;
  
  // Image lazy loading
  imageLazyLoading: boolean;
  imageLoadingStrategy: 'native' | 'intersection-observer' | 'progressive';
  imagePlaceholderType: 'blur' | 'skeleton' | 'color';
  
  // Asset lazy loading
  assetLazyLoading: boolean;
  assetPriority: Map<string, number>;
  
  // Dynamic imports
  dynamicImportTimeout: number;
  dynamicImportRetries: number;
  dynamicImportErrorHandling: 'fallback' | 'retry' | 'fail';
}

/**
 * Virtualization configuration
 */
export interface VirtualizationConfig {
  // List virtualization
  listVirtualization: boolean;
  itemHeight: number | 'dynamic';
  overscan: number;
  scrollDebounceTime: number;
  
  // Grid virtualization
  gridVirtualization: boolean;
  columnWidth: number | 'dynamic';
  rowHeight: number | 'dynamic';
  
  // Table virtualization
  tableVirtualization: boolean;
  fixedHeaders: boolean;
  fixedColumns: number;
  
  // Infinite scrolling
  infiniteScroll: boolean;
  loadMoreThreshold: number;
  loadMoreDebounce: number;
}

/**
 * Caching configuration
 */
export interface CachingConfig {
  // Browser caching
  browserCache: boolean;
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  cacheMaxAge: number;
  
  // Memory caching
  memoryCache: boolean;
  memoryCacheSize: number;
  memoryCacheTTL: number;
  
  // Service worker caching
  serviceWorker: boolean;
  serviceWorkerStrategy: 'precache' | 'runtime' | 'hybrid';
  offlineSupport: boolean;
  
  // API response caching
  apiCaching: boolean;
  apiCacheRules: Map<string, CacheRule>;
}

/**
 * Cache rule
 */
export interface CacheRule {
  pattern: RegExp;
  maxAge: number;
  strategy: 'cache-first' | 'network-first' | 'cache-only' | 'network-only';
  invalidateOn?: string[];
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  reportingEndpoint?: string;
  reportingInterval: number;
  includeResourceTimings: boolean;
  includeLongTasks: boolean;
  trackInteractions: boolean;
}

/**
 * Framework-specific runtime configuration
 */
export interface FrameworkRuntimeConfig {
  framework: SupportedFramework;
  optimizations: string[];
  renderingStrategy: 'csr' | 'ssr' | 'ssg' | 'isr';
  hydrationStrategy: 'full' | 'partial' | 'progressive';
  stateManagement: 'context' | 'redux' | 'mobx' | 'recoil' | 'zustand';
  componentOptimizations: ComponentOptimization[];
}

/**
 * Component optimization
 */
export interface ComponentOptimization {
  pattern: string;
  techniques: RuntimeOptimizationTechnique[];
  config: Record<string, any>;
}

/**
 * Runtime optimization result
 */
export interface RuntimeOptimizationResult {
  id: string;
  timestamp: Date;
  framework: SupportedFramework;
  
  // Performance improvements
  beforeMetrics: RuntimeMetrics;
  afterMetrics: RuntimeMetrics;
  improvements: PerformanceImprovement[];
  
  // Applied optimizations
  appliedOptimizations: AppliedOptimization[];
  
  // Generated code
  generatedCode: GeneratedCode[];
  
  // Recommendations
  recommendations: RuntimeRecommendation[];
}

/**
 * Performance improvement
 */
export interface PerformanceImprovement {
  metric: string;
  before: number;
  after: number;
  improvement: number;
  improvementPercent: number;
}

/**
 * Applied optimization
 */
export interface AppliedOptimization {
  technique: RuntimeOptimizationTechnique;
  targetComponents: string[];
  impact: 'high' | 'medium' | 'low';
  codeChanges: number;
  description: string;
}

/**
 * Generated code
 */
export interface GeneratedCode {
  filePath: string;
  codeType: 'component' | 'hook' | 'utility' | 'worker' | 'service-worker';
  content: string;
  description: string;
}

/**
 * Runtime recommendation
 */
export interface RuntimeRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'ux' | 'maintainability';
  title: string;
  description: string;
  implementation: string;
  estimatedImpact: string;
}

/**
 * Runtime Performance Optimizer
 */
export class RuntimeOptimizer extends EventEmitter {
  private config: RuntimeOptimizationConfig;
  private optimizationResults: Map<string, RuntimeOptimizationResult> = new Map();

  constructor(config: RuntimeOptimizationConfig) {
    super();
    this.config = config;
  }

  /**
   * Optimize runtime performance
   */
  public async optimizeRuntime(
    projectPath: string,
    framework: SupportedFramework,
    targetComponents?: string[]
  ): Promise<RuntimeOptimizationResult> {
    const optimizationId = this.generateOptimizationId();
    
    this.emit('runtime-optimization:started', { optimizationId, framework });
    
    try {
      // Measure baseline performance
      const beforeMetrics = await this.measureRuntimeMetrics(projectPath);
      
      // Apply optimizations
      const appliedOptimizations: AppliedOptimization[] = [];
      const generatedCode: GeneratedCode[] = [];
      
      for (const technique of this.config.enabledTechniques) {
        const optimization = await this.applyRuntimeOptimization(
          technique,
          projectPath,
          framework,
          targetComponents
        );
        
        if (optimization.applied) {
          appliedOptimizations.push(optimization.details);
          generatedCode.push(...optimization.generatedCode);
        }
        
        this.emit('runtime-optimization:progress', { 
          optimizationId, 
          technique, 
          applied: optimization.applied 
        });
      }
      
      // Measure performance after optimizations
      const afterMetrics = await this.measureRuntimeMetrics(projectPath);
      
      // Calculate improvements
      const improvements = this.calculateImprovements(beforeMetrics, afterMetrics);
      
      // Generate recommendations
      const recommendations = this.generateRuntimeRecommendations(
        afterMetrics,
        framework,
        appliedOptimizations
      );
      
      const result: RuntimeOptimizationResult = {
        id: optimizationId,
        timestamp: new Date(),
        framework,
        beforeMetrics,
        afterMetrics,
        improvements,
        appliedOptimizations,
        generatedCode,
        recommendations
      };
      
      this.optimizationResults.set(optimizationId, result);
      this.emit('runtime-optimization:completed', { optimizationId, result });
      
      return result;
      
    } catch (error) {
      this.emit('runtime-optimization:failed', { optimizationId, error });
      throw error;
    }
  }

  /**
   * Apply specific runtime optimization
   */
  private async applyRuntimeOptimization(
    technique: RuntimeOptimizationTechnique,
    projectPath: string,
    framework: SupportedFramework,
    targetComponents?: string[]
  ): Promise<{ applied: boolean; details: AppliedOptimization; generatedCode: GeneratedCode[] }> {
    let applied = false;
    let generatedCode: GeneratedCode[] = [];
    let details: AppliedOptimization;
    
    switch (technique) {
      case RuntimeOptimizationTechnique.LAZY_LOADING:
        const lazyResult = await this.applyLazyLoading(projectPath, framework, targetComponents);
        applied = lazyResult.applied;
        generatedCode = lazyResult.generatedCode;
        details = {
          technique,
          targetComponents: lazyResult.components,
          impact: 'high',
          codeChanges: lazyResult.changes,
          description: 'Implemented lazy loading for components and routes'
        };
        break;
        
      case RuntimeOptimizationTechnique.VIRTUALIZATION:
        const virtualResult = await this.applyVirtualization(projectPath, framework, targetComponents);
        applied = virtualResult.applied;
        generatedCode = virtualResult.generatedCode;
        details = {
          technique,
          targetComponents: virtualResult.components,
          impact: 'high',
          codeChanges: virtualResult.changes,
          description: 'Applied virtualization to large lists and grids'
        };
        break;
        
      case RuntimeOptimizationTechnique.MEMOIZATION:
        const memoResult = await this.applyMemoization(projectPath, framework, targetComponents);
        applied = memoResult.applied;
        generatedCode = memoResult.generatedCode;
        details = {
          technique,
          targetComponents: memoResult.components,
          impact: 'medium',
          codeChanges: memoResult.changes,
          description: 'Added memoization to expensive computations'
        };
        break;
        
      case RuntimeOptimizationTechnique.SERVICE_WORKER:
        const swResult = await this.applyServiceWorker(projectPath, framework);
        applied = swResult.applied;
        generatedCode = swResult.generatedCode;
        details = {
          technique,
          targetComponents: ['service-worker.js'],
          impact: 'high',
          codeChanges: swResult.changes,
          description: 'Implemented service worker for offline support and caching'
        };
        break;
        
      default:
        details = {
          technique,
          targetComponents: [],
          impact: 'low',
          codeChanges: 0,
          description: 'Optimization not implemented'
        };
    }
    
    return { applied, details, generatedCode };
  }

  /**
   * Apply lazy loading optimization
   */
  private async applyLazyLoading(
    projectPath: string,
    framework: SupportedFramework,
    targetComponents?: string[]
  ): Promise<{ applied: boolean; components: string[]; changes: number; generatedCode: GeneratedCode[] }> {
    const generatedCode: GeneratedCode[] = [];
    
    // Generate lazy loading wrapper
    if (framework === SupportedFramework.REACT || framework === SupportedFramework.NEXTJS) {
      generatedCode.push({
        filePath: 'utils/lazy-load.tsx',
        codeType: 'utility',
        content: this.generateReactLazyLoadingCode(),
        description: 'React lazy loading utility with error boundary'
      });
    }
    
    // Generate route-based lazy loading
    if (this.config.lazyLoading.routeLazyLoading) {
      generatedCode.push({
        filePath: 'routes/lazy-routes.ts',
        codeType: 'utility',
        content: this.generateLazyRoutesCode(framework),
        description: 'Route-based lazy loading configuration'
      });
    }
    
    // Generate image lazy loading component
    if (this.config.lazyLoading.imageLazyLoading) {
      generatedCode.push({
        filePath: 'components/LazyImage.tsx',
        codeType: 'component',
        content: this.generateLazyImageComponent(framework),
        description: 'Optimized lazy loading image component'
      });
    }
    
    return {
      applied: generatedCode.length > 0,
      components: targetComponents || ['routes', 'images', 'components'],
      changes: generatedCode.length * 50, // Approximate lines changed
      generatedCode
    };
  }

  /**
   * Apply virtualization optimization
   */
  private async applyVirtualization(
    projectPath: string,
    framework: SupportedFramework,
    targetComponents?: string[]
  ): Promise<{ applied: boolean; components: string[]; changes: number; generatedCode: GeneratedCode[] }> {
    const generatedCode: GeneratedCode[] = [];
    
    // Generate virtual list component
    if (this.config.virtualization.listVirtualization) {
      generatedCode.push({
        filePath: 'components/VirtualList.tsx',
        codeType: 'component',
        content: this.generateVirtualListComponent(framework),
        description: 'High-performance virtual list component'
      });
    }
    
    // Generate virtual grid component
    if (this.config.virtualization.gridVirtualization) {
      generatedCode.push({
        filePath: 'components/VirtualGrid.tsx',
        codeType: 'component',
        content: this.generateVirtualGridComponent(framework),
        description: 'High-performance virtual grid component'
      });
    }
    
    // Generate infinite scroll hook
    if (this.config.virtualization.infiniteScroll) {
      generatedCode.push({
        filePath: 'hooks/useInfiniteScroll.ts',
        codeType: 'hook',
        content: this.generateInfiniteScrollHook(framework),
        description: 'Infinite scroll hook with performance optimizations'
      });
    }
    
    return {
      applied: generatedCode.length > 0,
      components: targetComponents || ['lists', 'grids', 'tables'],
      changes: generatedCode.length * 100,
      generatedCode
    };
  }

  /**
   * Apply memoization optimization
   */
  private async applyMemoization(
    projectPath: string,
    framework: SupportedFramework,
    targetComponents?: string[]
  ): Promise<{ applied: boolean; components: string[]; changes: number; generatedCode: GeneratedCode[] }> {
    const generatedCode: GeneratedCode[] = [];
    
    // Generate memoization utilities
    generatedCode.push({
      filePath: 'utils/memoization.ts',
      codeType: 'utility',
      content: this.generateMemoizationUtilities(),
      description: 'Advanced memoization utilities with cache management'
    });
    
    // Generate React-specific memoization hooks
    if (framework === SupportedFramework.REACT || framework === SupportedFramework.NEXTJS) {
      generatedCode.push({
        filePath: 'hooks/useMemoizedValue.ts',
        codeType: 'hook',
        content: this.generateMemoizationHook(),
        description: 'Custom hook for memoizing expensive computations'
      });
    }
    
    return {
      applied: generatedCode.length > 0,
      components: targetComponents || ['computations', 'selectors', 'transforms'],
      changes: generatedCode.length * 40,
      generatedCode
    };
  }

  /**
   * Apply service worker optimization
   */
  private async applyServiceWorker(
    projectPath: string,
    framework: SupportedFramework
  ): Promise<{ applied: boolean; changes: number; generatedCode: GeneratedCode[] }> {
    const generatedCode: GeneratedCode[] = [];
    
    // Generate service worker
    generatedCode.push({
      filePath: 'public/service-worker.js',
      codeType: 'service-worker',
      content: this.generateServiceWorkerCode(),
      description: 'Optimized service worker with caching strategies'
    });
    
    // Generate service worker registration
    generatedCode.push({
      filePath: 'utils/service-worker-registration.ts',
      codeType: 'utility',
      content: this.generateServiceWorkerRegistration(),
      description: 'Service worker registration with update handling'
    });
    
    return {
      applied: true,
      changes: 200,
      generatedCode
    };
  }

  /**
   * Generate React lazy loading code
   */
  private generateReactLazyLoadingCode(): string {
    return `import React, { lazy, Suspense, ComponentType } from 'react';

// Lazy loading wrapper with error boundary
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      <ErrorBoundary>
        <LazyComponent {...props} />
      </ErrorBoundary>
    </Suspense>
  );
}

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="loading-spinner">
    <div className="spinner" />
  </div>
);

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Preload component utility
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  const componentPromise = importFunc();
  return componentPromise;
}

// Intersection observer based lazy loading
export function useLazyLoad<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = {}
): [React.RefObject<T>, boolean] {
  const ref = React.useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        ...options
      }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [options]);
  
  return [ref, isIntersecting];
}`;
  }

  /**
   * Generate lazy routes code
   */
  private generateLazyRoutesCode(framework: SupportedFramework): string {
    if (framework === SupportedFramework.NEXTJS) {
      return `import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Route preloading strategies
export enum PreloadStrategy {
  NONE = 'none',
  HOVER = 'hover',
  VISIBLE = 'visible',
  PREFETCH = 'prefetch'
}

// Lazy route configuration
export interface LazyRoute {
  path: string;
  component: () => Promise<{ default: ComponentType<any> }>;
  preload?: PreloadStrategy;
  fallback?: ComponentType;
}

// Create lazy routes with preloading
export function createLazyRoutes(routes: LazyRoute[]) {
  return routes.map(route => ({
    ...route,
    component: dynamic(route.component, {
      loading: route.fallback || (() => <div>Loading...</div>),
      ssr: true
    })
  }));
}

// Route preloader
export class RoutePreloader {
  private preloadedRoutes = new Set<string>();
  
  preload(route: LazyRoute) {
    if (this.preloadedRoutes.has(route.path)) return;
    
    route.component().then(() => {
      this.preloadedRoutes.add(route.path);
    });
  }
  
  preloadOnHover(route: LazyRoute) {
    return {
      onMouseEnter: () => this.preload(route),
      onTouchStart: () => this.preload(route)
    };
  }
  
  preloadVisible(route: LazyRoute, element: HTMLElement) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.preload(route);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    
    observer.observe(element);
  }
}

export const routePreloader = new RoutePreloader();`;
    }
    
    // React Router version
    return `import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

// Lazy route helper
export function createLazyRoute(
  path: string,
  importFunc: () => Promise<{ default: any }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);
  
  return (
    <Route
      path={path}
      element={
        <Suspense fallback={fallback || <div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      }
    />
  );
}

// Route preloading
export const preloadRoute = (importFunc: () => Promise<any>) => {
  importFunc();
};

// Batch route preloading
export const preloadRoutes = (
  routes: Array<() => Promise<any>>,
  delay = 1000
) => {
  routes.forEach((route, index) => {
    setTimeout(() => preloadRoute(route), delay * (index + 1));
  });
};`;
  }

  /**
   * Generate lazy image component
   */
  private generateLazyImageComponent(framework: SupportedFramework): string {
    return `import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholder?: string;
  blur?: boolean;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholder,
  blur = true,
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  className = '',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    if (!imageRef) return;
    
    // Native lazy loading support
    if ('loading' in HTMLImageElement.prototype) {
      imageRef.loading = 'lazy';
      setImageSrc(src);
      return;
    }
    
    // Intersection Observer fallback
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Preload image
          const img = new Image();
          img.src = src;
          
          img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
            onLoad?.();
          };
          
          img.onerror = () => {
            setIsError(true);
            onError?.();
          };
          
          observerRef.current?.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    
    observerRef.current.observe(imageRef);
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, [imageRef, src, threshold, rootMargin, onLoad, onError]);
  
  const imageClasses = [
    'lazy-image',
    className,
    blur && !isLoaded ? 'lazy-image--blur' : '',
    isLoaded ? 'lazy-image--loaded' : '',
    isError ? 'lazy-image--error' : ''
  ].filter(Boolean).join(' ');
  
  return (
    <>
      <img
        ref={setImageRef}
        src={imageSrc}
        className={imageClasses}
        {...props}
      />
      <style jsx>{\`
        .lazy-image {
          transition: filter 0.3s ease-in-out;
        }
        
        .lazy-image--blur {
          filter: blur(10px);
        }
        
        .lazy-image--loaded {
          filter: blur(0);
        }
        
        .lazy-image--error {
          opacity: 0.5;
        }
      \`}</style>
    </>
  );
};

// Lazy picture component with responsive images
export const LazyPicture: React.FC<{
  sources: Array<{ srcSet: string; media?: string; type?: string }>;
  src: string;
  alt: string;
  className?: string;
}> = ({ sources, src, alt, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const pictureRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    
    if (pictureRef.current) {
      observer.observe(pictureRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <picture ref={pictureRef} className={className}>
      {isVisible && sources.map((source, index) => (
        <source key={index} {...source} />
      ))}
      <LazyImage src={src} alt={alt} />
    </picture>
  );
};`;
  }

  /**
   * Generate virtual list component
   */
  private generateVirtualListComponent(framework: SupportedFramework): string {
    return `import React, { useState, useRef, useCallback, useEffect } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  height: number;
  width?: number | string;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  onScroll?: (scrollTop: number) => void;
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  width = '100%',
  overscan = 3,
  renderItem,
  onScroll,
  className = ''
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  // Calculate item heights
  const getItemHeight = useCallback(
    (index: number) => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );
  
  // Calculate total height
  const totalHeight = items.reduce(
    (acc, _, index) => acc + getItemHeight(index),
    0
  );
  
  // Calculate visible range
  const getVisibleRange = useCallback(() => {
    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = items.length - 1;
    
    // Find start index
    for (let i = 0; i < items.length; i++) {
      const itemH = getItemHeight(i);
      if (accumulatedHeight + itemH > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += itemH;
    }
    
    // Find end index
    accumulatedHeight = 0;
    for (let i = startIndex; i < items.length; i++) {
      if (accumulatedHeight > scrollTop + height) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
      accumulatedHeight += getItemHeight(i);
    }
    
    return { startIndex, endIndex };
  }, [items.length, scrollTop, height, overscan, getItemHeight]);
  
  const { startIndex, endIndex } = getVisibleRange();
  
  // Calculate offset for visible items
  const getItemOffset = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i);
      }
      return offset;
    },
    [getItemHeight]
  );
  
  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );
  
  // Render visible items
  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const item = items[i];
    const offset = getItemOffset(i);
    const itemH = getItemHeight(i);
    
    visibleItems.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          top: offset,
          height: itemH,
          width: '100%'
        }}
      >
        {renderItem(item, i)}
      </div>
    );
  }
  
  return (
    <div
      ref={scrollElementRef}
      className={\`virtual-list \${className}\`}
      style={{
        height,
        width,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

// Virtual list with dynamic heights
export function DynamicVirtualList<T>({
  items,
  estimatedItemHeight = 50,
  ...props
}: Omit<VirtualListProps<T>, 'itemHeight'> & {
  estimatedItemHeight?: number;
}) {
  const itemHeights = useRef<Map<number, number>>(new Map());
  const measurementCache = useRef<WeakMap<T, number>>(new WeakMap());
  
  const getItemHeight = useCallback(
    (index: number) => {
      return itemHeights.current.get(index) || estimatedItemHeight;
    },
    [estimatedItemHeight]
  );
  
  const measureItem = useCallback((element: HTMLElement | null, index: number) => {
    if (!element) return;
    
    const height = element.getBoundingClientRect().height;
    if (itemHeights.current.get(index) !== height) {
      itemHeights.current.set(index, height);
      // Trigger re-render if height changed
      element.dispatchEvent(new CustomEvent('heightchange'));
    }
  }, []);
  
  const renderItemWithMeasurement = useCallback(
    (item: T, index: number) => {
      return (
        <div ref={(el) => measureItem(el, index)}>
          {props.renderItem(item, index)}
        </div>
      );
    },
    [props.renderItem, measureItem]
  );
  
  return (
    <VirtualList
      {...props}
      items={items}
      itemHeight={getItemHeight}
      renderItem={renderItemWithMeasurement}
    />
  );
}`;
  }

  /**
   * Generate virtual grid component
   */
  private generateVirtualGridComponent(framework: SupportedFramework): string {
    return `import React, { useState, useRef, useCallback, useMemo } from 'react';

interface VirtualGridProps<T> {
  items: T[];
  columnCount: number | ((width: number) => number);
  rowHeight: number | ((index: number) => number);
  columnWidth: number | ((index: number) => number);
  height: number;
  width: number | string;
  gap?: number;
  overscan?: number;
  renderCell: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  columnCount,
  rowHeight,
  columnWidth,
  height,
  width = '100%',
  gap = 0,
  overscan = 1,
  renderCell,
  className = ''
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate dimensions
  const containerWidth = typeof width === 'number' ? width : 0;
  const cols = typeof columnCount === 'function' ? columnCount(containerWidth) : columnCount;
  const rowCount = Math.ceil(items.length / cols);
  
  // Get row height
  const getRowHeight = useCallback(
    (index: number) => {
      return typeof rowHeight === 'function' ? rowHeight(index) : rowHeight;
    },
    [rowHeight]
  );
  
  // Get column width
  const getColumnWidth = useCallback(
    (index: number) => {
      return typeof columnWidth === 'function' ? columnWidth(index) : columnWidth;
    },
    [columnWidth]
  );
  
  // Calculate total dimensions
  const totalHeight = useMemo(() => {
    let height = 0;
    for (let i = 0; i < rowCount; i++) {
      height += getRowHeight(i) + gap;
    }
    return height - gap;
  }, [rowCount, getRowHeight, gap]);
  
  const totalWidth = useMemo(() => {
    let width = 0;
    for (let i = 0; i < cols; i++) {
      width += getColumnWidth(i) + gap;
    }
    return width - gap;
  }, [cols, getColumnWidth, gap]);
  
  // Calculate visible range
  const getVisibleRange = useCallback(() => {
    let startRow = 0;
    let endRow = rowCount - 1;
    let startCol = 0;
    let endCol = cols - 1;
    
    // Find visible rows
    let accHeight = 0;
    for (let i = 0; i < rowCount; i++) {
      const rowH = getRowHeight(i) + gap;
      if (accHeight + rowH > scrollTop) {
        startRow = Math.max(0, i - overscan);
        break;
      }
      accHeight += rowH;
    }
    
    accHeight = 0;
    for (let i = startRow; i < rowCount; i++) {
      if (accHeight > scrollTop + height) {
        endRow = Math.min(rowCount - 1, i + overscan);
        break;
      }
      accHeight += getRowHeight(i) + gap;
    }
    
    // Find visible columns
    let accWidth = 0;
    for (let i = 0; i < cols; i++) {
      const colW = getColumnWidth(i) + gap;
      if (accWidth + colW > scrollLeft) {
        startCol = Math.max(0, i - overscan);
        break;
      }
      accWidth += colW;
    }
    
    accWidth = 0;
    for (let i = startCol; i < cols; i++) {
      if (accWidth > scrollLeft + containerWidth) {
        endCol = Math.min(cols - 1, i + overscan);
        break;
      }
      accWidth += getColumnWidth(i) + gap;
    }
    
    return { startRow, endRow, startCol, endCol };
  }, [
    rowCount,
    cols,
    scrollTop,
    scrollLeft,
    height,
    containerWidth,
    overscan,
    getRowHeight,
    getColumnWidth,
    gap
  ]);
  
  const { startRow, endRow, startCol, endCol } = getVisibleRange();
  
  // Calculate cell position
  const getCellPosition = useCallback(
    (row: number, col: number) => {
      let top = 0;
      for (let i = 0; i < row; i++) {
        top += getRowHeight(i) + gap;
      }
      
      let left = 0;
      for (let i = 0; i < col; i++) {
        left += getColumnWidth(i) + gap;
      }
      
      return { top, left };
    },
    [getRowHeight, getColumnWidth, gap]
  );
  
  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);
  
  // Render visible cells
  const visibleCells = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const index = row * cols + col;
      if (index >= items.length) continue;
      
      const item = items[index];
      const { top, left } = getCellPosition(row, col);
      const cellHeight = getRowHeight(row);
      const cellWidth = getColumnWidth(col);
      
      const style: React.CSSProperties = {
        position: 'absolute',
        top,
        left,
        height: cellHeight,
        width: cellWidth
      };
      
      visibleCells.push(
        <div key={\`\${row}-\${col}\`} style={style}>
          {renderCell(item, index, style)}
        </div>
      );
    }
  }
  
  return (
    <div
      ref={containerRef}
      className={\`virtual-grid \${className}\`}
      style={{
        height,
        width,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          width: totalWidth,
          position: 'relative'
        }}
      >
        {visibleCells}
      </div>
    </div>
  );
}`;
  }

  /**
   * Generate infinite scroll hook
   */
  private generateInfiniteScrollHook(framework: SupportedFramework): string {
    return `import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void | Promise<void>;
}

export function useInfiniteScroll({
  threshold = 0.1,
  rootMargin = '100px',
  hasMore,
  loading = false,
  onLoadMore
}: UseInfiniteScrollOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  const handleLoadMore = useCallback(async () => {
    if (isLoading || loading || !hasMore) return;
    
    setIsLoading(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, loading, hasMore, onLoadMore]);
  
  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          handleLoadMore();
        }
      },
      { threshold, rootMargin }
    );
    
    observerRef.current.observe(element);
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, hasMore, loading, handleLoadMore]);
  
  const setObserverTarget = useCallback((element: HTMLDivElement | null) => {
    // Disconnect from old element
    if (loadMoreRef.current && observerRef.current) {
      observerRef.current.unobserve(loadMoreRef.current);
    }
    
    // Set new element
    loadMoreRef.current = element;
    
    // Observe new element
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  }, []);
  
  return {
    loadMoreRef: setObserverTarget,
    isLoading: isLoading || loading,
    hasMore
  };
}

// Infinite scroll with virtual list integration
export function useVirtualInfiniteScroll<T>({
  items,
  loadMore,
  hasMore,
  pageSize = 20
}: {
  items: T[];
  loadMore: (page: number) => Promise<T[]>;
  hasMore: boolean;
  pageSize?: number;
}) {
  const [allItems, setAllItems] = useState<T[]>(items);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const newItems = await loadMore(page);
      setAllItems(prev => [...prev, ...newItems]);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, loadMore, page]);
  
  const { loadMoreRef, isLoading } = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: handleLoadMore
  });
  
  return {
    items: allItems,
    loadMoreRef,
    isLoading,
    error,
    hasMore,
    retry: handleLoadMore
  };
}`;
  }

  /**
   * Generate memoization utilities
   */
  private generateMemoizationUtilities(): string {
    return `// Advanced memoization utilities with cache management

interface MemoizeOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (...args: any[]) => string;
  onEvict?: (key: string, value: any) => void;
}

class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private accessOrder: string[] = [];
  
  constructor(
    private maxSize: number = 100,
    private ttl?: number
  ) {}
  
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // Check TTL
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }
    
    // Update access order
    this.updateAccessOrder(key);
    return entry.value;
  }
  
  set(key: string, value: T): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lru = this.accessOrder[0];
      this.delete(lru);
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
    this.updateAccessOrder(key);
  }
  
  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }
  
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
  
  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }
}

// Main memoization function
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: MemoizeOptions = {}
): T {
  const {
    maxSize = 100,
    ttl,
    keyGenerator = (...args) => JSON.stringify(args),
    onEvict
  } = options;
  
  const cache = new LRUCache<ReturnType<T>>(maxSize, ttl);
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);
    
    // Check cache
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    // Compute and cache result
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

// Async memoization
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: MemoizeOptions = {}
): T {
  const pendingCache = new Map<string, Promise<any>>();
  const memoized = memoize(fn, options);
  
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = options.keyGenerator?.(...args) || JSON.stringify(args);
    
    // Check if already pending
    if (pendingCache.has(key)) {
      return pendingCache.get(key)!;
    }
    
    // Create pending promise
    const promise = memoized(...args);
    pendingCache.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      pendingCache.delete(key);
    }
  }) as T;
}

// Debounce with memoization
export function memoizeDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options: MemoizeOptions = {}
): T & { cancel: () => void; flush: () => void } {
  const memoized = memoize(fn, options);
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    return new Promise<ReturnType<T>>((resolve) => {
      timeoutId = setTimeout(() => {
        resolve(memoized(...args));
        timeoutId = null;
      }, delay);
    });
  };
  
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      const result = memoized(...lastArgs);
      timeoutId = null;
      return result;
    }
  };
  
  return debounced as T & { cancel: () => void; flush: () => void };
}

// Selective memoization based on arguments
export function memoizeSelective<T extends (...args: any[]) => any>(
  fn: T,
  shouldMemoize: (...args: Parameters<T>) => boolean,
  options: MemoizeOptions = {}
): T {
  const memoized = memoize(fn, options);
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    if (shouldMemoize(...args)) {
      return memoized(...args);
    }
    return fn(...args);
  }) as T;
}`;
  }

  /**
   * Generate memoization hook
   */
  private generateMemoizationHook(): string {
    return `import { useRef, useCallback, useEffect } from 'react';
import { memoize, memoizeAsync } from '../utils/memoization';

// Hook for memoizing expensive computations
export function useMemoizedValue<T>(
  computeFn: () => T,
  deps: React.DependencyList,
  options?: {
    maxSize?: number;
    ttl?: number;
  }
): T {
  const memoizedFn = useRef(
    memoize(computeFn, {
      maxSize: options?.maxSize || 1,
      ttl: options?.ttl
    })
  );
  
  useEffect(() => {
    // Clear cache when dependencies change
    memoizedFn.current = memoize(computeFn, {
      maxSize: options?.maxSize || 1,
      ttl: options?.ttl
    });
  }, deps);
  
  return memoizedFn.current();
}

// Hook for memoizing async computations
export function useMemoizedAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList,
  options?: {
    maxSize?: number;
    ttl?: number;
  }
): {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<{
    data: T | undefined;
    loading: boolean;
    error: Error | null;
  }>({
    data: undefined,
    loading: true,
    error: null
  });
  
  const memoizedFn = useRef(
    memoizeAsync(asyncFn, {
      maxSize: options?.maxSize || 1,
      ttl: options?.ttl
    })
  );
  
  useEffect(() => {
    memoizedFn.current = memoizeAsync(asyncFn, {
      maxSize: options?.maxSize || 1,
      ttl: options?.ttl
    });
  }, deps);
  
  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await memoizedFn.current();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error as Error 
      }));
    }
  }, []);
  
  useEffect(() => {
    fetch();
  }, deps);
  
  return {
    ...state,
    refetch: fetch
  };
}

// Hook for memoizing callbacks with dependencies
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  options?: {
    maxSize?: number;
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  }
): T {
  const memoizedFn = useRef<T>();
  
  useEffect(() => {
    memoizedFn.current = memoize(callback, {
      maxSize: options?.maxSize || 10,
      ttl: options?.ttl,
      keyGenerator: options?.keyGenerator
    });
  }, deps);
  
  return useCallback(
    (...args: Parameters<T>): ReturnType<T> => {
      if (!memoizedFn.current) {
        throw new Error('Memoized function not initialized');
      }
      return memoizedFn.current(...args);
    },
    deps
  ) as T;
}`;
  }

  /**
   * Generate service worker code
   */
  private generateServiceWorkerCode(): string {
    return `// Optimized Service Worker with advanced caching strategies

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  STATIC: \`static-cache-\${CACHE_VERSION}\`,
  DYNAMIC: \`dynamic-cache-\${CACHE_VERSION}\`,
  IMAGES: \`image-cache-\${CACHE_VERSION}\`,
  API: \`api-cache-\${CACHE_VERSION}\`
};

// Assets to precache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Route to strategy mapping
const ROUTE_STRATEGIES = new Map([
  [/\\.(?:js|css)$/, CACHE_STRATEGIES.CACHE_FIRST],
  [/\\.(?:png|jpg|jpeg|svg|gif|webp)$/, CACHE_STRATEGIES.CACHE_FIRST],
  [/\\/api\\//, CACHE_STRATEGIES.NETWORK_FIRST],
  [/\\.(?:woff|woff2|ttf|otf)$/, CACHE_STRATEGIES.CACHE_FIRST]
]);

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.STATIC).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return !Object.values(CACHE_NAMES).includes(cacheName);
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Determine strategy
  let strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  for (const [pattern, strat] of ROUTE_STRATEGIES) {
    if (pattern.test(url.pathname)) {
      strategy = strat;
      break;
    }
  }
  
  event.respondWith(handleRequest(request, strategy));
});

// Request handler
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
    case CACHE_STRATEGIES.CACHE_ONLY:
      return caches.match(request) || new Response('Not found', { status: 404 });
    default:
      return networkFirst(request);
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(getCacheName(request));
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Network error', { status: 503 });
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(getCacheName(request));
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Network error', { status: 503 });
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(getCacheName(request));
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  });
  
  return cached || fetchPromise;
}

// Determine cache name based on request
function getCacheName(request) {
  const url = new URL(request.url);
  
  if (/\\.(?:png|jpg|jpeg|svg|gif|webp)$/.test(url.pathname)) {
    return CACHE_NAMES.IMAGES;
  }
  
  if (url.pathname.startsWith('/api/')) {
    return CACHE_NAMES.API;
  }
  
  return CACHE_NAMES.DYNAMIC;
}

// Background sync for offline requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-requests') {
    event.waitUntil(syncOfflineRequests());
  }
});

async function syncOfflineRequests() {
  // Implement offline request queue synchronization
  const cache = await caches.open('offline-requests');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        await cache.delete(request);
      }
    } catch (error) {
      // Keep in cache for next sync
    }
  }
}

// Push notification support
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});`;
  }

  /**
   * Generate service worker registration
   */
  private generateServiceWorkerRegistration(): string {
    return `// Service Worker Registration with update handling

export interface ServiceWorkerConfig {
  enabled: boolean;
  scope?: string;
  updateViaCache?: 'all' | 'imports' | 'none';
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;
  
  async register(config: ServiceWorkerConfig): Promise<void> {
    if (!config.enabled || !('serviceWorker' in navigator)) {
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.register(
        '/service-worker.js',
        {
          scope: config.scope || '/',
          updateViaCache: config.updateViaCache || 'none'
        }
      );
      
      this.registration = registration;
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.updateAvailable = true;
            config.onUpdate?.(registration);
          }
        });
      });
      
      // Initial success
      if (registration.active) {
        config.onSuccess?.(registration);
      }
      
      // Check for updates periodically
      this.startUpdateCheck();
      
    } catch (error) {
      config.onError?.(error as Error);
    }
  }
  
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;
    
    return await this.registration.unregister();
  }
  
  async update(): Promise<void> {
    if (!this.registration) return;
    
    await this.registration.update();
  }
  
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) return;
    
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  
  private startUpdateCheck(): void {
    // Check for updates every hour
    setInterval(() => {
      this.update();
    }, 60 * 60 * 1000);
  }
  
  // Utility methods
  async clearAllCaches(): Promise<void> {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
  
  async getCacheSize(): Promise<number> {
    if (!navigator.storage?.estimate) {
      return 0;
    }
    
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// React hook for service worker
export function useServiceWorker(config: ServiceWorkerConfig) {
  const [isReady, setIsReady] = React.useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  
  React.useEffect(() => {
    // Register service worker
    serviceWorkerManager.register({
      ...config,
      onSuccess: (registration) => {
        setIsReady(true);
        config.onSuccess?.(registration);
      },
      onUpdate: (registration) => {
        setIsUpdateAvailable(true);
        config.onUpdate?.(registration);
      }
    });
    
    // Listen for online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const updateServiceWorker = React.useCallback(async () => {
    await serviceWorkerManager.skipWaiting();
    window.location.reload();
  }, []);
  
  return {
    isReady,
    isUpdateAvailable,
    isOffline,
    updateServiceWorker
  };
}`;
  }

  /**
   * Measure runtime metrics
   */
  private async measureRuntimeMetrics(projectPath: string): Promise<RuntimeMetrics> {
    // Mock implementation - real implementation would use Lighthouse or similar
    return {
      firstContentfulPaint: Math.random() * 2000 + 500,
      largestContentfulPaint: Math.random() * 3000 + 1000,
      firstInputDelay: Math.random() * 100 + 20,
      cumulativeLayoutShift: Math.random() * 0.2,
      timeToInteractive: Math.random() * 4000 + 2000,
      totalBlockingTime: Math.random() * 500 + 100,
      speedIndex: Math.random() * 3000 + 1000,
      jsHeapUsed: Math.random() * 50 * 1024 * 1024,
      jsHeapTotal: Math.random() * 100 * 1024 * 1024,
      domNodes: Math.floor(Math.random() * 1000) + 500,
      layoutsPerSecond: Math.random() * 10 + 5,
      recalcStylesPerSecond: Math.random() * 20 + 10,
      requestCount: Math.floor(Math.random() * 50) + 20,
      requestSize: Math.random() * 2 * 1024 * 1024,
      responseTime: Math.random() * 500 + 100,
      cacheHitRate: Math.random() * 0.5 + 0.5
    };
  }

  /**
   * Calculate performance improvements
   */
  private calculateImprovements(
    before: RuntimeMetrics,
    after: RuntimeMetrics
  ): PerformanceImprovement[] {
    const improvements: PerformanceImprovement[] = [];
    
    const metrics = [
      { key: 'firstContentfulPaint', name: 'First Contentful Paint' },
      { key: 'largestContentfulPaint', name: 'Largest Contentful Paint' },
      { key: 'firstInputDelay', name: 'First Input Delay' },
      { key: 'cumulativeLayoutShift', name: 'Cumulative Layout Shift' },
      { key: 'timeToInteractive', name: 'Time to Interactive' },
      { key: 'totalBlockingTime', name: 'Total Blocking Time' }
    ];
    
    for (const { key, name } of metrics) {
      const beforeValue = before[key as keyof RuntimeMetrics] as number;
      const afterValue = after[key as keyof RuntimeMetrics] as number;
      const improvement = beforeValue - afterValue;
      const improvementPercent = (improvement / beforeValue) * 100;
      
      improvements.push({
        metric: name,
        before: beforeValue,
        after: afterValue,
        improvement,
        improvementPercent
      });
    }
    
    return improvements;
  }

  /**
   * Generate runtime recommendations
   */
  private generateRuntimeRecommendations(
    metrics: RuntimeMetrics,
    framework: SupportedFramework,
    appliedOptimizations: AppliedOptimization[]
  ): RuntimeRecommendation[] {
    const recommendations: RuntimeRecommendation[] = [];
    
    // FCP recommendations
    if (metrics.firstContentfulPaint > this.config.targetFCP) {
      recommendations.push({
        id: 'improve-fcp',
        priority: 'high',
        category: 'performance',
        title: 'Improve First Contentful Paint',
        description: `FCP (${metrics.firstContentfulPaint.toFixed(0)}ms) exceeds target (${this.config.targetFCP}ms)`,
        implementation: 'Optimize critical rendering path and reduce render-blocking resources',
        estimatedImpact: '20-40% improvement'
      });
    }
    
    // LCP recommendations
    if (metrics.largestContentfulPaint > this.config.targetLCP) {
      recommendations.push({
        id: 'improve-lcp',
        priority: 'high',
        category: 'performance',
        title: 'Improve Largest Contentful Paint',
        description: `LCP (${metrics.largestContentfulPaint.toFixed(0)}ms) exceeds target (${this.config.targetLCP}ms)`,
        implementation: 'Optimize image loading, use responsive images, and preload critical resources',
        estimatedImpact: '30-50% improvement'
      });
    }
    
    // Memory recommendations
    if (metrics.jsHeapUsed > 50 * 1024 * 1024) {
      recommendations.push({
        id: 'reduce-memory',
        priority: 'medium',
        category: 'performance',
        title: 'Reduce Memory Usage',
        description: `High memory usage detected (${(metrics.jsHeapUsed / 1024 / 1024).toFixed(1)}MB)`,
        implementation: 'Implement virtualization for large lists and optimize data structures',
        estimatedImpact: '40-60% reduction'
      });
    }
    
    return recommendations;
  }

  private generateOptimizationId(): string {
    return `runtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get optimization results
   */
  public getOptimizationResults(): RuntimeOptimizationResult[] {
    return Array.from(this.optimizationResults.values());
  }
}