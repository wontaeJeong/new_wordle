interface FeatureFlags {
  practiceMode: boolean;
  customWordLists: boolean;
  extraThemes: boolean;
}

export const featureFlags: FeatureFlags = {
  practiceMode: import.meta.env.VITE_FEATURE_PRACTICE_MODE === 'true',
  customWordLists: false,
  extraThemes: false,
};
