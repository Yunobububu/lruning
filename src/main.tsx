import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ReactGA from 'react-ga4';
import {
  GOOGLE_ANALYTICS_TRACKING_ID,
  USE_GOOGLE_ANALYTICS,
} from './utils/const';
import '@/styles/index.css';
import { withOptionalGAPageTracking } from './utils/trackRoute';

import Home from '@/pages/index';
import Tracks from '@/pages/tracks';
import Heatmap from '@/pages/heatmap';
import Races from '@/pages/races';
import RunLife from '@/pages/runlife';
import RaceDetail from '@/pages/racedetail';
import NotFound from '@/pages/404';

if (USE_GOOGLE_ANALYTICS) {
  ReactGA.initialize(GOOGLE_ANALYTICS_TRACKING_ID);
}

const routes = createBrowserRouter(
  [
    {
      path: '/',
      element: withOptionalGAPageTracking(<Home />),
    },
    {
      path: '/tracks',
      element: withOptionalGAPageTracking(<Tracks />),
    },
    {
      path: '/heatmap',
      element: withOptionalGAPageTracking(<Heatmap />),
    },
    {
      path: '/races',
      element: withOptionalGAPageTracking(<Races />),
    },
    {
      path: '/races/:id',
      element: withOptionalGAPageTracking(<RaceDetail />),
    },
    {
      path: '/runlife',
      element: withOptionalGAPageTracking(<RunLife />),
    },
    {
      path: '*',
      element: withOptionalGAPageTracking(<NotFound />),
    },
  ],
  {}
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <RouterProvider router={routes} />
    </HelmetProvider>
  </React.StrictMode>
);
