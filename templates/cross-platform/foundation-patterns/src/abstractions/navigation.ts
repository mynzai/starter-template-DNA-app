/**
 * Cross-Platform Navigation Abstraction
 * Provides unified navigation patterns across Flutter, React Native, Next.js, Tauri, and SvelteKit
 */

export interface RouteParams {
  [key: string]: string | number | boolean | undefined;
}

export interface RouteQuery {
  [key: string]: string | string[] | undefined;
}

export interface NavigationState {
  pathname: string;
  params: RouteParams;
  query: RouteQuery;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
}

export interface RouteDefinition {
  name: string;
  path: string;
  component?: any;
  guard?: (state: NavigationState) => boolean | Promise<boolean>;
  meta?: Record<string, any>;
  children?: RouteDefinition[];
}

export interface NavigationOptions {
  replace?: boolean;
  state?: any;
  animate?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  clearHistory?: boolean;
}

export interface NavigationEvent {
  type: 'beforeNavigate' | 'afterNavigate' | 'routeChange';
  from?: NavigationState;
  to?: NavigationState;
  cancelled?: boolean;
}

/**
 * Platform-agnostic navigation interface
 */
export abstract class NavigationAdapter {
  abstract platform: 'flutter' | 'react-native' | 'nextjs' | 'tauri' | 'sveltekit' | 'web';
  
  // Core navigation
  abstract navigate(route: string, params?: RouteParams, options?: NavigationOptions): Promise<void>;
  abstract goBack(): Promise<void>;
  abstract goForward(): Promise<void>;
  abstract replace(route: string, params?: RouteParams): Promise<void>;
  abstract reset(route: string, params?: RouteParams): Promise<void>;
  
  // State management
  abstract getCurrentState(): NavigationState;
  abstract canGoBack(): boolean;
  abstract canGoForward(): boolean;
  
  // Route management
  abstract addRoute(route: RouteDefinition): void;
  abstract removeRoute(name: string): void;
  abstract getRoute(name: string): RouteDefinition | undefined;
  abstract getAllRoutes(): RouteDefinition[];
  
  // URL and deep linking
  abstract buildUrl(route: string, params?: RouteParams, query?: RouteQuery): string;
  abstract parseUrl(url: string): { route: string; params: RouteParams; query: RouteQuery };
  abstract setDeepLinkHandler(handler: (url: string) => void): void;
  
  // Event handling
  abstract onNavigate(callback: (event: NavigationEvent) => void): () => void;
  abstract onRouteChange(callback: (state: NavigationState) => void): () => void;
  
  // Platform-specific features
  abstract supportsTabNavigation(): boolean;
  abstract supportsDrawerNavigation(): boolean;
  abstract supportsModalNavigation(): boolean;
  abstract supportsNestedNavigation(): boolean;
}

/**
 * Tauri Navigation Implementation
 */
export class TauriNavigationAdapter extends NavigationAdapter {
  platform = 'tauri' as const;
  private routes: Map<string, RouteDefinition> = new Map();
  private currentState: NavigationState;
  private history: NavigationState[] = [];
  private historyIndex = -1;
  private listeners: ((event: NavigationEvent) => void)[] = [];
  private routeChangeListeners: ((state: NavigationState) => void)[] = [];
  
  constructor() {
    super();
    this.currentState = {
      pathname: '/',
      params: {},
      query: {},
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
    };
    
    // Initialize with current route
    this.addToHistory(this.currentState);
  }
  
  async navigate(route: string, params: RouteParams = {}, options: NavigationOptions = {}): Promise<void> {
    const beforeEvent: NavigationEvent = {
      type: 'beforeNavigate',
      from: this.currentState,
      to: {
        pathname: route,
        params,
        query: {},
        canGoBack: this.historyIndex > 0,
        canGoForward: false,
        isLoading: false,
      },
    };
    
    this.notifyListeners(beforeEvent);
    
    if (beforeEvent.cancelled) return;
    
    const newState: NavigationState = {
      pathname: route,
      params,
      query: {},
      canGoBack: this.historyIndex > 0,
      canGoForward: false,
      isLoading: false,
    };
    
    if (options.replace) {
      this.history[this.historyIndex] = newState;
    } else if (options.clearHistory) {
      this.history = [newState];
      this.historyIndex = 0;
    } else {
      this.addToHistory(newState);
    }
    
    this.currentState = newState;
    this.updateCanNavigate();
    
    const afterEvent: NavigationEvent = {
      type: 'afterNavigate',
      from: beforeEvent.from,
      to: newState,
    };
    
    this.notifyListeners(afterEvent);
    this.notifyRouteChangeListeners(newState);
  }
  
  async goBack(): Promise<void> {
    if (this.canGoBack()) {
      this.historyIndex--;
      this.currentState = this.history[this.historyIndex];
      this.updateCanNavigate();
      this.notifyRouteChangeListeners(this.currentState);
    }
  }
  
  async goForward(): Promise<void> {
    if (this.canGoForward()) {
      this.historyIndex++;
      this.currentState = this.history[this.historyIndex];
      this.updateCanNavigate();
      this.notifyRouteChangeListeners(this.currentState);
    }
  }
  
  async replace(route: string, params: RouteParams = {}): Promise<void> {
    await this.navigate(route, params, { replace: true });
  }
  
  async reset(route: string, params: RouteParams = {}): Promise<void> {
    await this.navigate(route, params, { clearHistory: true });
  }
  
  getCurrentState(): NavigationState {
    return { ...this.currentState };
  }
  
  canGoBack(): boolean {
    return this.historyIndex > 0;
  }
  
  canGoForward(): boolean {
    return this.historyIndex < this.history.length - 1;
  }
  
  addRoute(route: RouteDefinition): void {
    this.routes.set(route.name, route);
  }
  
  removeRoute(name: string): void {
    this.routes.delete(name);
  }
  
  getRoute(name: string): RouteDefinition | undefined {
    return this.routes.get(name);
  }
  
  getAllRoutes(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }
  
  buildUrl(route: string, params: RouteParams = {}, query: RouteQuery = {}): string {
    let url = route;
    
    // Replace path parameters
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, String(value));
    }
    
    // Add query parameters
    const queryString = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryString.append(key, v));
        } else {
          queryString.set(key, String(value));
        }
      }
    }
    
    const queryStr = queryString.toString();
    return queryStr ? `${url}?${queryStr}` : url;
  }
  
  parseUrl(url: string): { route: string; params: RouteParams; query: RouteQuery } {
    const [pathname, search] = url.split('?');
    const query: RouteQuery = {};
    
    if (search) {
      const searchParams = new URLSearchParams(search);
      for (const [key, value] of searchParams.entries()) {
        if (query[key]) {
          if (Array.isArray(query[key])) {
            (query[key] as string[]).push(value);
          } else {
            query[key] = [query[key] as string, value];
          }
        } else {
          query[key] = value;
        }
      }
    }
    
    return {
      route: pathname,
      params: {}, // Extract from path matching
      query,
    };
  }
  
  setDeepLinkHandler(handler: (url: string) => void): void {
    // Tauri deep link handling would be set up via Tauri configuration
    // This is a placeholder for the API
  }
  
  onNavigate(callback: (event: NavigationEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  onRouteChange(callback: (state: NavigationState) => void): () => void {
    this.routeChangeListeners.push(callback);
    return () => {
      const index = this.routeChangeListeners.indexOf(callback);
      if (index > -1) {
        this.routeChangeListeners.splice(index, 1);
      }
    };
  }
  
  supportsTabNavigation(): boolean {
    return true;
  }
  
  supportsDrawerNavigation(): boolean {
    return true;
  }
  
  supportsModalNavigation(): boolean {
    return true;
  }
  
  supportsNestedNavigation(): boolean {
    return true;
  }
  
  private addToHistory(state: NavigationState): void {
    // Remove any forward history
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    this.historyIndex = this.history.length - 1;
  }
  
  private updateCanNavigate(): void {
    this.currentState.canGoBack = this.canGoBack();
    this.currentState.canGoForward = this.canGoForward();
  }
  
  private notifyListeners(event: NavigationEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
  
  private notifyRouteChangeListeners(state: NavigationState): void {
    this.routeChangeListeners.forEach(listener => listener(state));
  }
}

/**
 * React Native Navigation Implementation
 */
export class ReactNativeNavigationAdapter extends NavigationAdapter {
  platform = 'react-native' as const;
  private navigation: any;
  private routes: Map<string, RouteDefinition> = new Map();
  
  constructor(navigation?: any) {
    super();
    this.navigation = navigation;
  }
  
  setNavigation(navigation: any): void {
    this.navigation = navigation;
  }
  
  async navigate(route: string, params: RouteParams = {}, options: NavigationOptions = {}): Promise<void> {
    if (!this.navigation) {
      throw new Error('Navigation instance not set');
    }
    
    if (options.replace) {
      this.navigation.replace(route, params);
    } else {
      this.navigation.navigate(route, params);
    }
  }
  
  async goBack(): Promise<void> {
    if (this.navigation?.canGoBack()) {
      this.navigation.goBack();
    }
  }
  
  async goForward(): Promise<void> {
    // React Navigation doesn't have forward navigation
  }
  
  async replace(route: string, params: RouteParams = {}): Promise<void> {
    await this.navigate(route, params, { replace: true });
  }
  
  async reset(route: string, params: RouteParams = {}): Promise<void> {
    if (this.navigation) {
      this.navigation.reset({
        index: 0,
        routes: [{ name: route, params }],
      });
    }
  }
  
  getCurrentState(): NavigationState {
    if (!this.navigation) {
      return {
        pathname: '/',
        params: {},
        query: {},
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
      };
    }
    
    const state = this.navigation.getState();
    const currentRoute = state.routes[state.index];
    
    return {
      pathname: currentRoute.name,
      params: currentRoute.params || {},
      query: {},
      canGoBack: this.navigation.canGoBack(),
      canGoForward: false,
      isLoading: false,
    };
  }
  
  canGoBack(): boolean {
    return this.navigation?.canGoBack() || false;
  }
  
  canGoForward(): boolean {
    return false;
  }
  
  addRoute(route: RouteDefinition): void {
    this.routes.set(route.name, route);
  }
  
  removeRoute(name: string): void {
    this.routes.delete(name);
  }
  
  getRoute(name: string): RouteDefinition | undefined {
    return this.routes.get(name);
  }
  
  getAllRoutes(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }
  
  buildUrl(route: string, params: RouteParams = {}, query: RouteQuery = {}): string {
    return route; // React Native uses screen names
  }
  
  parseUrl(url: string): { route: string; params: RouteParams; query: RouteQuery } {
    return {
      route: url,
      params: {},
      query: {},
    };
  }
  
  setDeepLinkHandler(handler: (url: string) => void): void {
    const { Linking } = require('react-native');
    
    const handleUrl = (event: { url: string }) => {
      handler(event.url);
    };
    
    Linking.addEventListener('url', handleUrl);
  }
  
  onNavigate(callback: (event: NavigationEvent) => void): () => void {
    if (!this.navigation) return () => {};
    
    const unsubscribe = this.navigation.addListener('state', (e: any) => {
      callback({
        type: 'routeChange',
        to: this.getCurrentState(),
      });
    });
    
    return unsubscribe;
  }
  
  onRouteChange(callback: (state: NavigationState) => void): () => void {
    if (!this.navigation) return () => {};
    
    const unsubscribe = this.navigation.addListener('state', () => {
      callback(this.getCurrentState());
    });
    
    return unsubscribe;
  }
  
  supportsTabNavigation(): boolean {
    return true;
  }
  
  supportsDrawerNavigation(): boolean {
    return true;
  }
  
  supportsModalNavigation(): boolean {
    return true;
  }
  
  supportsNestedNavigation(): boolean {
    return true;
  }
}

/**
 * Next.js Navigation Implementation
 */
export class NextJSNavigationAdapter extends NavigationAdapter {
  platform = 'nextjs' as const;
  private router: any;
  private routes: Map<string, RouteDefinition> = new Map();
  
  constructor() {
    super();
    if (typeof window !== 'undefined') {
      this.initializeRouter();
    }
  }
  
  private async initializeRouter(): Promise<void> {
    try {
      const { useRouter } = await import('next/router');
      // This would be used in a component context
    } catch {
      // Router not available
    }
  }
  
  setRouter(router: any): void {
    this.router = router;
  }
  
  async navigate(route: string, params: RouteParams = {}, options: NavigationOptions = {}): Promise<void> {
    if (!this.router) {
      if (typeof window !== 'undefined') {
        const url = this.buildUrl(route, params);
        if (options.replace) {
          window.history.replaceState(null, '', url);
        } else {
          window.history.pushState(null, '', url);
        }
      }
      return;
    }
    
    const url = this.buildUrl(route, params);
    
    if (options.replace) {
      await this.router.replace(url);
    } else {
      await this.router.push(url);
    }
  }
  
  async goBack(): Promise<void> {
    if (this.router) {
      this.router.back();
    } else if (typeof window !== 'undefined') {
      window.history.back();
    }
  }
  
  async goForward(): Promise<void> {
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  }
  
  async replace(route: string, params: RouteParams = {}): Promise<void> {
    await this.navigate(route, params, { replace: true });
  }
  
  async reset(route: string, params: RouteParams = {}): Promise<void> {
    await this.navigate(route, params, { replace: true });
  }
  
  getCurrentState(): NavigationState {
    if (this.router) {
      return {
        pathname: this.router.pathname,
        params: this.router.query || {},
        query: this.router.query || {},
        canGoBack: true,
        canGoForward: true,
        isLoading: this.router.isFallback || false,
      };
    }
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const query: RouteQuery = {};
      
      for (const [key, value] of url.searchParams.entries()) {
        query[key] = value;
      }
      
      return {
        pathname: url.pathname,
        params: {},
        query,
        canGoBack: window.history.length > 1,
        canGoForward: false,
        isLoading: false,
      };
    }
    
    return {
      pathname: '/',
      params: {},
      query: {},
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
    };
  }
  
  canGoBack(): boolean {
    return typeof window !== 'undefined' && window.history.length > 1;
  }
  
  canGoForward(): boolean {
    return true; // Browser can go forward
  }
  
  addRoute(route: RouteDefinition): void {
    this.routes.set(route.name, route);
  }
  
  removeRoute(name: string): void {
    this.routes.delete(name);
  }
  
  getRoute(name: string): RouteDefinition | undefined {
    return this.routes.get(name);
  }
  
  getAllRoutes(): RouteDefinition[] {
    return Array.from(this.routes.values());
  }
  
  buildUrl(route: string, params: RouteParams = {}, query: RouteQuery = {}): string {
    let url = route;
    
    // Replace dynamic segments
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`[${key}]`, String(value));
      url = url.replace(`:${key}`, String(value));
    }
    
    // Add query parameters
    const queryString = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryString.append(key, v));
        } else {
          queryString.set(key, String(value));
        }
      }
    }
    
    const queryStr = queryString.toString();
    return queryStr ? `${url}?${queryStr}` : url;
  }
  
  parseUrl(url: string): { route: string; params: RouteParams; query: RouteQuery } {
    const urlObj = new URL(url, 'http://example.com');
    const query: RouteQuery = {};
    
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (query[key]) {
        if (Array.isArray(query[key])) {
          (query[key] as string[]).push(value);
        } else {
          query[key] = [query[key] as string, value];
        }
      } else {
        query[key] = value;
      }
    }
    
    return {
      route: urlObj.pathname,
      params: {},
      query,
    };
  }
  
  setDeepLinkHandler(handler: (url: string) => void): void {
    if (typeof window !== 'undefined') {
      const handlePopState = () => {
        handler(window.location.href);
      };
      
      window.addEventListener('popstate', handlePopState);
    }
  }
  
  onNavigate(callback: (event: NavigationEvent) => void): () => void {
    if (this.router) {
      const handleRouteChange = (url: string) => {
        callback({
          type: 'routeChange',
          to: this.getCurrentState(),
        });
      };
      
      this.router.events.on('routeChangeComplete', handleRouteChange);
      
      return () => {
        this.router.events.off('routeChangeComplete', handleRouteChange);
      };
    }
    
    return () => {};
  }
  
  onRouteChange(callback: (state: NavigationState) => void): () => void {
    if (this.router) {
      const handleRouteChange = () => {
        callback(this.getCurrentState());
      };
      
      this.router.events.on('routeChangeComplete', handleRouteChange);
      
      return () => {
        this.router.events.off('routeChangeComplete', handleRouteChange);
      };
    }
    
    return () => {};
  }
  
  supportsTabNavigation(): boolean {
    return false;
  }
  
  supportsDrawerNavigation(): boolean {
    return false;
  }
  
  supportsModalNavigation(): boolean {
    return true;
  }
  
  supportsNestedNavigation(): boolean {
    return true;
  }
}

/**
 * Platform Detection and Factory
 */
export function createNavigationAdapter(): NavigationAdapter {
  // Browser environment
  if (typeof window !== 'undefined') {
    // Check for Tauri
    if ('__TAURI__' in window) {
      return new TauriNavigationAdapter();
    }
    
    // Check for Next.js
    if ('__NEXT_DATA__' in window) {
      return new NextJSNavigationAdapter();
    }
    
    return new NextJSNavigationAdapter(); // Default web
  }
  
  // React Native environment
  if (typeof global !== 'undefined' && 'navigator' in global && 'product' in (global as any).navigator) {
    return new ReactNativeNavigationAdapter();
  }
  
  // Default to Next.js for SSR environments
  return new NextJSNavigationAdapter();
}

/**
 * Convenience wrapper for navigation operations
 */
export class NavigationManager {
  private adapter: NavigationAdapter;
  
  constructor(adapter?: NavigationAdapter) {
    this.adapter = adapter || createNavigationAdapter();
  }
  
  get platform() {
    return this.adapter.platform;
  }
  
  get capabilities() {
    return {
      tabNavigation: this.adapter.supportsTabNavigation(),
      drawerNavigation: this.adapter.supportsDrawerNavigation(),
      modalNavigation: this.adapter.supportsModalNavigation(),
      nestedNavigation: this.adapter.supportsNestedNavigation(),
    };
  }
  
  // Core navigation
  navigate(route: string, params?: RouteParams, options?: NavigationOptions) {
    return this.adapter.navigate(route, params, options);
  }
  
  goBack() {
    return this.adapter.goBack();
  }
  
  goForward() {
    return this.adapter.goForward();
  }
  
  replace(route: string, params?: RouteParams) {
    return this.adapter.replace(route, params);
  }
  
  reset(route: string, params?: RouteParams) {
    return this.adapter.reset(route, params);
  }
  
  // State management
  getCurrentState() {
    return this.adapter.getCurrentState();
  }
  
  canGoBack() {
    return this.adapter.canGoBack();
  }
  
  canGoForward() {
    return this.adapter.canGoForward();
  }
  
  // Route management
  addRoute(route: RouteDefinition) {
    return this.adapter.addRoute(route);
  }
  
  removeRoute(name: string) {
    return this.adapter.removeRoute(name);
  }
  
  getRoute(name: string) {
    return this.adapter.getRoute(name);
  }
  
  getAllRoutes() {
    return this.adapter.getAllRoutes();
  }
  
  // URL handling
  buildUrl(route: string, params?: RouteParams, query?: RouteQuery) {
    return this.adapter.buildUrl(route, params, query);
  }
  
  parseUrl(url: string) {
    return this.adapter.parseUrl(url);
  }
  
  setDeepLinkHandler(handler: (url: string) => void) {
    return this.adapter.setDeepLinkHandler(handler);
  }
  
  // Event handling
  onNavigate(callback: (event: NavigationEvent) => void) {
    return this.adapter.onNavigate(callback);
  }
  
  onRouteChange(callback: (state: NavigationState) => void) {
    return this.adapter.onRouteChange(callback);
  }
}

// Export singleton instance
export const navigationManager = new NavigationManager();