import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { HttpError } from './api/http';
import { App } from './App';
import { refreshSession } from './auth/client';
import { preloadWeatherChart } from './components/WeatherChart/lazy';
import './styles/global.css';

// A 401 from the API means the session expired or was revoked: go back to the sign-in screen.
const onError = (error: Error) => {
  if (error instanceof HttpError && error.status === 401) refreshSession();
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

preloadWeatherChart();
