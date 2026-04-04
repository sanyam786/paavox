'use client';

import { useState, useEffect } from 'react';
import apiClient from './apiClient';

export interface UserSettings {
  niche: string;
  bio: string;
  default_tone: string;
  brand_voice: string;
  active_platforms: string[];
  posting_frequency: string;
  audience_persona: string;
  location: string;
}

const DEFAULTS: UserSettings = {
  niche: '',
  bio: '',
  default_tone: 'engaging',
  brand_voice: '',
  active_platforms: [],
  posting_frequency: 'daily',
  audience_persona: '',
  location: '',
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiClient.get('/api/v1/brands/active')
      .then(({ data }) => {
        if (data && Object.keys(data).length > 0) {
          setSettings({ ...DEFAULTS, ...data });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return { settings, loaded };
}
