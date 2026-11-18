import { getEnv } from './env.js';

export const destinationKeys = ['whatsapp', 'github', 'website', 'wa-server'] as const;

export type DestinationKey = (typeof destinationKeys)[number];

export type Destination = {
  key: DestinationKey;
  label: string;
  url: string;
};

export function isDestinationKey(value: string): value is DestinationKey {
  return (destinationKeys as readonly string[]).includes(value);
}

export function getDestinations(): Record<DestinationKey, Destination> {
  const env = getEnv();

  return {
    whatsapp: {
      key: 'whatsapp',
      label: 'WhatsApp',
      url: `https://wa.me/${env.WHATSAPP_PHONE_NUMBER}`,
    },
    github: {
      key: 'github',
      label: 'GitHub profile',
      url: env.GITHUB_PROFILE_URL,
    },
    website: {
      key: 'website',
      label: 'Personal website',
      url: env.WEBSITE_URL,
    },
    'wa-server': {
      key: 'wa-server',
      label: 'WhatsApp Business API project',
      url: env.GITHUB_WORK_URL,
    },
  };
}
