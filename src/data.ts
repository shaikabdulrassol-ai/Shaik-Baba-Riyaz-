import { Story, BuddyType, BuddyInfo } from "./types";

export const PRESET_STORIES: Story[] = [
  {
    title: "Rusty's Giant Peanut Butter Mountain",
    topic: "A small adventurous puppy searching for a mythical mountain of peanut butter.",
    genre: "Silly Fun",
    ageGroup: "Under 5",
    artStyle: "Colorful Cartoon",
    imageSize: "1K",
    pages: [
      {
        pageNumber: 1,
        text: "Rusty was a small puppy with very big floppy ears and a nose that could sniff out peanut butter cookies from three blocks away! He dreamed of gold peanut butter rivers day and night.",
        visualDescription: "A happy, fluffy small brown puppy with oversized floppy ears looking up with stars in his eyes, surrounded by whimsical floating peanut butter jars. Highly colorful, vibrant digital cartoon illustration, warm lighting."
      },
      {
        pageNumber: 2,
        text: "One sunny morning, Rusty packed his tiny red backpack with crackers and set off into the green Whispering Woods. The birds chirped, 'Rusty, where are you bouncing today?' and Rusty barked, 'To the Giant Peanut Butter Mountain!'",
        visualDescription: "A small puppy wearing a tiny red backpack marching proudly down a winding dirt path in a warm, friendly forest. Sunbeams filtering through large green cartoon trees, cute blue birds watching him, colorful cartoon style."
      },
      {
        pageNumber: 3,
        text: "Suddenly, Rusty saw a magnificent golden hill that smelled incredibly delicious! He climbed to the very top, took a big lick of the mountain, and giggled. 'Barks! It's real!' He had found it!",
        visualDescription: "A joyful brown puppy sitting happily on top of a smooth, glossy golden hill made of peanut butter, licking his nose with a massive smile. Colorful confetti clouds, whimsical adventure scenery, kid cartoon style.",
        choices: [
          "Build a big chocolate slide down the mountain",
          "Explore a bubbly marshmallow cave at the bottom",
          "Throw a giant peanut butter party for his animal friends"
        ]
      }
    ]
  },
  {
    title: "Luna's Lost Star Sparkle",
    topic: "A young astronaut girl helping a little star find its missing magical shine.",
    genre: "Magical Bedtime",
    ageGroup: "5-8",
    artStyle: "Claymation / 3D Toy",
    imageSize: "1K",
    pages: [
      {
        pageNumber: 1,
        text: "Luna lived in a silver treetop observatory, watching the heavens curl up to sleep. But tonight, the sky looked dark and lonely. Her favorite star friend, Twinkles, had lost its beautiful golden glow!",
        visualDescription: "A curious little girl with bright eyes and a miniature silver space helmet looking through a big brass telescope inside a whimsical wooden treehouse. A dark navy nights sky outside with sleeping moon, chunky 3D clay style."
      },
      {
        pageNumber: 2,
        text: "Luna hopped inside her magical cosmic star-glider and zoomed deep into the dark velvet cosmos, catching stardust in a glowing glass bottle to help her sad star friend.",
        visualDescription: "A cute little girl in a space suit piloting a glowing mini glider spaceship through a deep violet cosmic nebula, capturing sparkling yellow stardust in a small glass jar, stylized 3D toy / claymation style."
      },
      {
        pageNumber: 3,
        text: "With a gentle tap, Luna poured the golden stardust on Twinkles' crown. Instantly, a magnificent wave of warm blue and gold light filled the cozy universe, singing the cosmos a sweet bedtime lullaby.",
        visualDescription: "A happy, adorable round star character wearing a crown of shiny gold dust, smiling warmly next to Luna. Background is a comforting sky filled with soft glowing stars and cozy pastel clouds, 3D clay sculpture style.",
        choices: [
          "Ride on a rocket swing to explore the candy nebula",
          "Seek out the castle of the sleeping Moon King",
          "Help Twinkles build a sparkling constellation slide"
        ]
      }
    ]
  }
];

export const STORIES_BUDDIES: Record<BuddyType, BuddyInfo> = {
  Barnaby: {
    name: "Barnaby",
    avatar: "🦉",
    roleTitle: "Story Wizard",
    description: "A wise, elderly owl with tiny round spectacles who loves explaining big words, lore, and helping you brainstorm story ideas.",
    greetingString: "Whooo-t! Greetings, little adventurer! I am Barnaby the Story Wizard. Ask me to explain a big word, tell you about the magical lore of our stories, or help you brainstorm an amazing plot twist!",
    personalityStyle: "Magic, wise, cozy, and educational",
    suggestedPrompts: [
      "What does 'observatory' mean?",
      "Help me brainstorm another adventure for Rusty the puppy!",
      "Tell me a fun myth about the moon.",
      "Why do stars twinkle?"
    ]
  },
  Penny: {
    name: "Penny",
    avatar: "🧚",
    roleTitle: "Playful Pixie",
    description: "An energetic, glowing story pixie who loves playing quick text games, telling silly jokes, and asking about your feelings.",
    greetingString: "Oh my pixie-dust! Spark-tastic to meet you! I'm Penny, and I live right inside these pages. Should we talk about the characters, tell a silly joke, or play a make-believe pixie game?",
    personalityStyle: "Joyful, silly, bright, and interactive",
    suggestedPrompts: [
      "Tell me a funny fairy-tale joke!",
      "What would you do if you had a mountain of peanut butter?",
      "Let's play a make-believe pixie game!",
      "Are you friends with Luna and Twinkles?"
    ]
  },
  Dash: {
    name: "Dash",
    avatar: "🐰",
    roleTitle: "Flash Rabbit",
    description: "A super-fast rabbit wearing racing goggles who speaks in playful rhymes, short tongue-twisters, and fast bounces.",
    greetingString: "Boing, boing! Zoom! I'm Dash! The fastest, hop-happiest rabbit in the story world! Ask me for a short funny poem, a crazy tongue-twister, or a fast spelling game! Let's jump!",
    personalityStyle: "Bouncy, fast-paced, rhymed, and energetic",
    suggestedPrompts: [
      "Give me a funny rhymes poem about puppies!",
      "Give me a hard tongue twister to try!",
      "Zoom! Can we play a short speed spelling game?",
      "Tell me a rabbit joke super fast!"
    ]
  }
};

export const ART_STYLES = [
  { id: "vibrant_cartoon", name: "Colorful Cartoon", icon: "🎨" },
  { id: "watercolour_fantasy", name: "Watercolour Fantasy", icon: "🖌️" },
  { id: "clay_3d", name: "Claymation / 3D Toy", icon: "🧸" },
  { id: "classic_drawing", name: "Classic Fairy Tale Drawing", icon: "📔" },
  { id: "retro_pixel", name: "Magical Pixel Art", icon: "👾" }
];

export const GENRES = [
  { id: "bedtime", name: "Bedtime", description: "Soft, calming, and cozy lullabies", icon: "🌙" },
  { id: "adventure", name: "Adventure", description: "Exotic quests, search and rescue", icon: "🗺️" },
  { id: "funny", name: "Silly Fun", description: "Humorous antics and giggly stories", icon: "😜" },
  { id: "mystery", name: "Magical Mystery", description: "Solving riddles and secret paths", icon: "🔑" }
];

export const AGE_GROUPS = [
  { id: "under_5", name: "Toddler (Under 5)", description: "Simple words, repetitive rhythmic sentences" },
  { id: "5-8", name: "Early Reader (5 to 8)", description: "Imaginative plots, engaging vocabulary" },
  { id: "9-12", name: "Young Explorer (9 to 12)", description: "Profound plots, rich lore and word choices" }
];
