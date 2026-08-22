/**
 * Predefined realistic professional avatar options for Dayflow HRMS.
 */

export interface AvatarPreset {
  id: string;
  name: string;
  dataUrl: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "avatar-male",
    name: "Male Professional",
    dataUrl: "/avatars/alex.jpg",
  },
  {
    id: "avatar-female",
    name: "Female Professional",
    dataUrl: "/avatars/sarah.jpg",
  },
];
