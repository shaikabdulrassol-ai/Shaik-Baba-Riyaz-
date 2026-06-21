export interface StoryPage {
  pageNumber: number;
  text: string;
  visualDescription: string;
  imageUrl?: string;
  audioUrl?: string;
  isImageLoading?: boolean;
  isAudioLoading?: boolean;
  choices?: string[]; // 2-3 interactive choices presenting what happens next
  chosenOption?: string; // which choice the child clicked to get here
}

export interface Story {
  id?: string; // Unique identifier for library management
  title: string;
  pages: StoryPage[];
  artStyle: string;
  ageGroup: string;
  genre: string;
  topic: string;
  imageSize: "1K" | "2K" | "4K";
  isFavorite?: boolean; // favoriting status in library
  tags?: string[]; // custom tags/shelves (e.g. Bedtime, Silly, Super Hero, Active)
  customNotes?: string; // a short custom note or child's review
  createdAt?: string; // when it was created/saved
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

export type BuddyType = "Barnaby" | "Penny" | "Dash";

export interface BuddyInfo {
  name: string;
  avatar: string;
  description: string;
  greetingString: string;
  roleTitle: string;
  personalityStyle: string;
  suggestedPrompts: string[];
}
