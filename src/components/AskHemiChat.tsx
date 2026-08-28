import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { getOrCreateAskHemiVisitorId } from './askHemiIdentity';

const CHATWOOT_BASE_URL = 'https://hwj-inbox.aandrlifestyle.com';
const WEBSITE_TOKEN = import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN?.trim();

const PRIVATE_PATH_PREFIXES = ['/dashboard', '/staff', '/expense', '/import', '/admin'];

declare global {
  interface Window {
    chatwootSettings?: Record<string, unknown>;
    chatwootSDK?: {
      run: (options: { websiteToken: string; baseUrl: string }) => void;
    };
    $chatwoot?: {
      toggle: (state?: 'open' | 'close') => void;
      toggleBubbleVisibility: (state: 'show' | 'hide') => void;
      setUser: (identifier: string, attributes: { name: string }) => void;
    };
  }
}

function setAnonymousVisitor() {
  if (!window.$chatwoot) return;

  try {
    const visitorId = getOrCreateAskHemiVisitorId({
      storage: window.localStorage,
      cryptoImpl: window.crypto,
    });
    window.$chatwoot.setUser(visitorId, { name: 'Website visitor' });
  } catch (error) {
    // The widget remains usable if browser storage is blocked. Chatwoot will
    // retain its own anonymous session instead of receiving our stable ID.
    console.warn('Ask Hemi could not retain an anonymous visitor ID.', error);
  }
}

/**
 * Loads the self-hosted Chatwoot website widget on public pages only.
 *
 * The website token is deliberately build-time gated. Until a private website
 * inbox has been created and its token supplied, this component renders
 * nothing and performs no network request.
 */
export function AskHemiChat() {
  const location = useLocation();
  const isPrivateRoute = PRIVATE_PATH_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  );

  useEffect(() => {
    if (!WEBSITE_TOKEN) return;

    if (isPrivateRoute) {
      window.$chatwoot?.toggle('close');
      window.$chatwoot?.toggleBubbleVisibility('hide');
      return;
    }

    if (window.$chatwoot) {
      window.$chatwoot.toggleBubbleVisibility('show');
      setAnonymousVisitor();
      return;
    }

    window.chatwootSettings = {
      hideMessageBubble: false,
      position: 'right',
      locale: 'en',
      useBrowserLanguage: true,
      darkMode: 'auto',
      type: 'expanded_bubble',
      launcherTitle: 'Ask Hemi',
      welcomeTitle: "Hi, I'm Hemi",
      welcomeDescription:
        'Ask me about our location, opening hours, menu or delivery. If I cannot help, I will bring in the Hemingways team.',
      availableMessage: 'Send me your question and I will do my best to help.',
      unavailableMessage:
        'You can still leave a message. The Hemingways team will pick it up as soon as possible.',
      enableFileUpload: false,
      enableEmojiPicker: true,
      enableEndConversation: true,
    };

    const handleReady = () => {
      window.$chatwoot?.toggleBubbleVisibility('show');
      setAnonymousVisitor();
    };
    window.addEventListener('chatwoot:ready', handleReady, { once: true });

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-hemingways-chatwoot-widget="true"]',
    );

    if (existingScript) {
      return () => {
        window.removeEventListener('chatwoot:ready', handleReady);
      };
    }

    const script = document.createElement('script');
    script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;
    script.dataset.hemingwaysChatwootWidget = 'true';
    script.onload = () => {
      window.chatwootSDK?.run({
        websiteToken: WEBSITE_TOKEN,
        baseUrl: CHATWOOT_BASE_URL,
      });
    };
    script.onerror = () => {
      window.removeEventListener('chatwoot:ready', handleReady);
      console.error('Ask Hemi chat could not be loaded.');
    };

    document.body.appendChild(script);

    return () => {
      window.removeEventListener('chatwoot:ready', handleReady);
    };
  }, [isPrivateRoute]);

  return null;
}
