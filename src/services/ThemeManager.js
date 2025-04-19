/**
 * Theme manager for handling dark/light theme changes
 */
class ThemeManager {
  constructor() {
    this.darkTheme = true;
    this.listeners = [];
    
    // Initialize from local storage or system preference if available
    this.initialize();
  }
  
  /**
   * Initialize theme preference from storage or system preference
   */
  initialize() {
    if (typeof window === 'undefined') return;
    
    // Check local storage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.darkTheme = savedTheme === 'dark';
    } else {
      // Check system preference
      this.darkTheme = window.matchMedia && 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Apply initial theme
    this.applyTheme();
    
    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', e => {
          if (!localStorage.getItem('theme')) {
            this.darkTheme = e.matches;
            this.applyTheme();
          }
        });
    }
  }
  
  /**
   * Toggle between dark and light theme
   */
  toggleTheme() {
    this.darkTheme = !this.darkTheme;
    this.saveTheme();
    this.applyTheme();
  }
  
  /**
   * Apply the current theme to the DOM
   */
  applyTheme() {
    if (typeof document === 'undefined') return;
    
    const htmlElement = document.documentElement;
    
    if (this.darkTheme) {
      htmlElement.classList.add('dark');
      htmlElement.classList.remove('light');
    } else {
      htmlElement.classList.add('light');
      htmlElement.classList.remove('dark');
    }
    
    // Notify listeners
    this.notifyListeners();
  }
  
  /**
   * Set the theme explicitly
   * @param {boolean} isDark - Whether to use dark theme
   */
  setTheme(isDark) {
    if (this.darkTheme !== isDark) {
      this.darkTheme = isDark;
      this.saveTheme();
      this.applyTheme();
    }
  }
  
  /**
   * Save theme preference to localStorage
   */
  saveTheme() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('theme', this.darkTheme ? 'dark' : 'light');
  }
  
  /**
   * Get the current theme
   * @returns {string} 'dark' or 'light'
   */
  getTheme() {
    return this.darkTheme ? 'dark' : 'light';
  }
  
  /**
   * Check if dark theme is active
   * @returns {boolean} true if dark theme is active
   */
  isDarkTheme() {
    return this.darkTheme;
  }
  
  /**
   * Add a listener for theme changes
   * @param {Function} listener - Callback function
   */
  addListener(listener) {
    if (typeof listener === 'function' && !this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
  }
  
  /**
   * Remove a theme change listener
   * @param {Function} listener - Listener to remove
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Notify all listeners of theme change
   */
  notifyListeners() {
    const theme = this.getTheme();
    this.listeners.forEach(listener => {
      try {
        listener(theme);
      } catch (e) {
        console.error('Error in theme change listener:', e);
      }
    });
  }
}

// Create a singleton instance
const themeManager = new ThemeManager();

export default themeManager; 