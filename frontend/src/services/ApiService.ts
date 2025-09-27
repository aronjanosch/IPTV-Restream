const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const apiService = {
  /**
   * Execute API request
   * @param path - Path (e.g. "/channels/")
   * @param method - HTTP-Method (GET, POST, etc.)
   * @param api_url - The API URL (default: API_BASE_URL + '/api')
   * @param body - The request body (e.g. POST)
   * @returns Ein Promise with the parsed JSON response to class T
   */
  async request<T>(path: string, method: HttpMethod = 'GET', api_url: string = API_BASE_URL + '/api', body?: unknown): Promise<T> {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${api_url}${path}`, options);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      console.error(`Error in API request to ${api_url}${path}:`, error);
      throw error; 
    }
  },
};

export default apiService;
