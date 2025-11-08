
/**
 * Main ClientSideConfiguration class that manages all application settings.
 * This class follows the Singleton pattern to ensure only one instance exists.
 * 
 * @example
 * // How to import and use the ClientSideConfig in your application
 * import ClientSideConfig from '@/ClientSideConfig';
 * 
 * // Access ClientSideConfiguration values
 * console.log(ClientSideConfig.port); // e.g., 3000
 * console.log(ClientSideConfig.appUrl); // e.g., "https://myapp.com"
 * 
 * // Check environment
 * if (ClientSideConfig.isProduction) {
 *   // Handle production-specific logic
 * }
 */
export class ClientSideConfig {
    /** Singleton instance - stores the single instance of this class */
    private static instance: ClientSideConfig;
  
    /**
     * WebSocket server ClientSideConfiguration
     */
    public ws: {
      /** WebSocket server port */
      /** WebSocket server hostname */
      host: string;
      /** WebSocket server port */
      port: number;
    };
  
      /**
       * Private constructor to prevent direct instantiation
       * Use ClientSideConfig.getInstance() instead
       */
      private constructor() {
          this.ws = {
              host: import.meta.env.VITE_WS_HOST,
              port: import.meta.env.VITE_WS_PORT,
          };
      }
  
  
    /**
     * Gets the singleton instance of the ClientSideConfig class.
     * Creates a new instance if one doesn't exist, otherwise returns the existing instance.
     * 
     * @returns {ClientSideConfig} The singleton ClientSideConfig instance
     * 
     * @example
     * const ClientSideConfig = ClientSideConfig.getInstance();
     * console.log(ClientSideConfig.port);
     */
    public static getInstance(): ClientSideConfig {
      if (!ClientSideConfig.instance) {
        ClientSideConfig.instance = new ClientSideConfig();
      }
  
      return ClientSideConfig.instance;
    }
  }
  
  // Export a singleton instance of the ClientSideConfig class
  export default ClientSideConfig.getInstance();
  