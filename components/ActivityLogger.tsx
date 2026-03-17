'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface ActivityEvent {
  timestamp: string;
  type: 'page_view' | 'click' | 'form_interaction' | 'data_export';
  page: string;
  details: Record<string, any>;
  userAgent: string;
  sessionId: string;
}

export default function ActivityLogger() {
  const pathname = usePathname();

  // Generate or get session ID
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('dashboardSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('dashboardSessionId', sessionId);
    }
    return sessionId;
  };

  // Log activity event
  const logActivity = (type: ActivityEvent['type'], details: Record<string, any> = {}) => {
    const event: ActivityEvent = {
      timestamp: new Date().toISOString(),
      type,
      page: pathname,
      details,
      userAgent: navigator.userAgent,
      sessionId: getSessionId(),
    };

    // Store locally
    const existingLogs = JSON.parse(localStorage.getItem('dashboardActivityLogs') || '[]');
    existingLogs.push(event);
    
    // Keep only last 1000 events to prevent storage bloat
    if (existingLogs.length > 1000) {
      existingLogs.splice(0, existingLogs.length - 1000);
    }
    
    localStorage.setItem('dashboardActivityLogs', JSON.stringify(existingLogs));

    // Also send to API endpoint for server-side logging
    fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      // Fail silently - localStorage backup exists
    });
  };

  // Log page views
  useEffect(() => {
    logActivity('page_view', { 
      path: pathname,
      referrer: document.referrer || 'direct',
    });
  }, [pathname]);

  // Log clicks on interactive elements
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Log meaningful clicks (buttons, links, form elements)
      if (target.matches('button, a, input, select, [role="button"], [data-track]')) {
        const elementText = target.textContent?.trim() || target.getAttribute('aria-label') || '';
        const elementType = target.tagName.toLowerCase();
        const elementClass = target.className || '';
        
        logActivity('click', {
          elementType,
          elementText: elementText.substring(0, 100), // Limit text length
          elementClass: elementClass.substring(0, 100),
          coordinates: { x: e.clientX, y: e.clientY },
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Log form interactions
  useEffect(() => {
    const handleFormInteraction = (e: Event) => {
      const target = e.target as HTMLElement;
      
      if (target.matches('input, select, textarea')) {
        const fieldName = target.getAttribute('name') || target.getAttribute('id') || '';
        const fieldType = target.getAttribute('type') || target.tagName.toLowerCase();
        
        logActivity('form_interaction', {
          fieldName,
          fieldType,
          eventType: e.type,
        });
      }
    };

    document.addEventListener('change', handleFormInteraction);
    document.addEventListener('focus', handleFormInteraction);
    return () => {
      document.removeEventListener('change', handleFormInteraction);
      document.removeEventListener('focus', handleFormInteraction);
    };
  }, []);

  return null; // This component doesn't render anything
}