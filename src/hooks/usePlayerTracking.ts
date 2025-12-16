import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface TrackingOptions {
  sessionId: string;
  playerId?: string;
  userId?: string;
}

export const usePlayerTracking = (options: TrackingOptions) => {
  const { sessionId, playerId, userId } = options;
  const lastPageRef = useRef<string>('');

  const trackEvent = useCallback(async (eventType: string, eventData?: Record<string, unknown>) => {
    if (!sessionId) return;

    try {
      await supabase.from('player_events').insert([{
        session_id: sessionId,
        player_id: playerId || null,
        user_id: userId || null,
        event_type: eventType,
        page_url: window.location.pathname,
        event_data: (eventData || {}) as Json
      }]);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, [sessionId, playerId, userId]);

  // Track page views
  useEffect(() => {
    const currentPage = window.location.pathname;
    if (currentPage !== lastPageRef.current) {
      lastPageRef.current = currentPage;
      trackEvent('page_view', { path: currentPage });
    }
  }, [trackEvent]);

  // Track when user becomes active/inactive
  useEffect(() => {
    let activityTimeout: NodeJS.Timeout;

    const handleActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        trackEvent('idle');
      }, 60000); // Mark as idle after 1 minute of inactivity
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    
    // Initial activity
    handleActivity();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      clearTimeout(activityTimeout);
    };
  }, [trackEvent]);

  return { trackEvent };
};
