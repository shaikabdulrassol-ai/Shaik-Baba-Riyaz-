import React, { useState, useEffect, useRef } from "react";
import { PRESET_STORIES, STORIES_BUDDIES, ART_STYLES, GENRES, AGE_GROUPS } from "./data";
import { Story, StoryPage, ChatMessage, BuddyType, BuddyInfo } from "./types";
import {
  BookOpen,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Send,
  Wand2,
  Compass,
  MessageSquare,
  RefreshCw,
  Info,
  HelpCircle,
  Clock,
  Mic,
  ArrowRight,
  RotateCcw,
  Volume1,
  FileText,
  MousePointerClick
} from "lucide-react";

export default function App() {
  // App States
  const [currentView, setCurrentView] = useState<"library" | "creator" | "book">("library");
  const [myStories, setMyStories] = useState<Story[]>(() => {
    const saved = localStorage.getItem("kids_stories_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((story: any, idx: number) => ({
            ...story,
            id: story.id || `story-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            isFavorite: story.isFavorite || false,
            tags: story.tags || [story.genre || "Adventure"],
            customNotes: story.customNotes || "",
            createdAt: story.createdAt || new Date().toLocaleDateString()
          }));
        }
      } catch (err) {
        console.error("Failed to parse saved stories:", err);
      }
    }
    // Fallback to PRESET_STORIES with default metadata initialized
    return PRESET_STORIES.map((story, idx) => ({
      ...story,
      id: `preset-${idx}`,
      isFavorite: false,
      tags: ["Classic", story.genre],
      customNotes: "",
      createdAt: "Classic Realm"
    }));
  });

  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Library Organization and Search Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterTag, setSelectedFilterTag] = useState<string>("All");

  // Edit details (Magical Library Card modal) state
  const [storyToEditId, setStoryToEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Tag options for kids/parents to organize stories
  const AVAILABLE_ORGANIZER_TAGS = [
    "Classic",
    "Favorites",
    "Ongoing",
    "Completed",
    "Bedtime",
    "Adventure",
    "Silly Fun",
    "Kid Original"
  ];

  // Interactive branching extension state
  const [isExtendingStory, setIsExtendingStory] = useState(false);
  const [extendingChoice, setExtendingChoice] = useState<string | null>(null);

  // Creation Wizard Form States
  const [topic, setTopic] = useState("");
  const [selectedArtStyle, setSelectedArtStyle] = useState("Vibrant Cartoon");
  const [selectedGenre, setSelectedGenre] = useState("Silly Fun");
  const [selectedAge, setSelectedAge] = useState("5-8");
  const [pageCount, setPageCount] = useState<number>(4);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [generationStep, setGenerationStep] = useState("");

  // Speech and Audio States
  const [selectedVoice, setSelectedVoice] = useState("Puck"); // Puck, Charon, Kore, Fenrir, Zephyr
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightWordIdx, setHighlightWordIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Chat Buddy States
  const [activeBuddy, setActiveBuddy] = useState<BuddyType>("Barnaby");
  const [chatInputValue, setChatInputValue] = useState("");
  const [chatMessages, setChatMessages] = useState<Record<BuddyType, ChatMessage[]>>({
    Barnaby: [
      {
        id: "b-welcome",
        role: "assistant",
        text: STORIES_BUDDIES.Barnaby.greetingString,
        timestamp: new Date()
      }
    ],
    Penny: [
      {
        id: "p-welcome",
        role: "assistant",
        text: STORIES_BUDDIES.Penny.greetingString,
        timestamp: new Date()
      }
    ],
    Dash: [
      {
        id: "d-welcome",
        role: "assistant",
        text: STORIES_BUDDIES.Dash.greetingString,
        timestamp: new Date()
      }
    ]
  });
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Image rebuilding state (Re-magic)
  const [isReimagining, setIsReimagining] = useState(false);

  // API Config checking
  const [isServiceConnected, setIsServiceConnected] = useState(true);

  // Local storage auto save loop
  useEffect(() => {
    localStorage.setItem("kids_stories_v1", JSON.stringify(myStories));
  }, [myStories]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeBuddy, isChatLoading]);

  // Handle Audio State Cleanups
  useEffect(() => {
    stopCurrentAudio();
    // Pre-trigger auto-reset word highlight
    setHighlightWordIdx(null);
  }, [currentPageIndex, activeStoryIndex]);

  const activeStory: Story = myStories[activeStoryIndex] || PRESET_STORIES[0];
  const activePage: StoryPage = activeStory.pages[currentPageIndex] || {
    pageNumber: 1,
    text: "No pages found",
    visualDescription: ""
  };

  // Filter stories based on searchQuery and selectedFilterTag
  const filteredStories = myStories.filter(story => {
    const matchesSearch = 
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (story.topic || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilterTag === "All") return true;
    if (selectedFilterTag === "Favorites") return !!story.isFavorite;
    
    return story.tags?.includes(selectedFilterTag);
  });

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setHighlightWordIdx(null);
  };

  // Toggle favorite helper for organizing the bookshelves
  const handleToggleFavorite = (storyId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMyStories(prev => 
      prev.map(s => s.id === storyId ? { ...s, isFavorite: !s.isFavorite } : s)
    );
  };

  // Open the detail modifier modal (Magical Library Card)
  const handleOpenEditModal = (story: Story, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStoryToEditId(story.id);
    setEditTitle(story.title);
    setEditNotes(story.customNotes || "");
    setEditTags(story.tags || []);
    setIsEditModalOpen(true);
  };

  // Save modified details back into local storage and state
  const handleSaveStoryDetails = () => {
    if (!editTitle.trim()) {
      alert("Oops! The magical book deserves a wonderful name. Please write a title!");
      return;
    }
    setMyStories(prev => 
      prev.map(s => 
        s.id === storyToEditId 
          ? { ...s, title: editTitle.trim(), customNotes: editNotes.trim(), tags: editTags } 
          : s
      )
    );
    setIsEditModalOpen(false);
    setStoryToEditId(null);
  };

  // Branch and extend the story dynamically when the child clicks a choice
  const handleChoiceSelection = async (choiceText: string) => {
    if (isExtendingStory) return;
    setIsExtendingStory(true);
    setExtendingChoice(choiceText);
    stopCurrentAudio();

    try {
      // Keep track of plot to summarize as context for the next generation
      const previousPagesText = activeStory.pages
        .map(p => `Page ${p.pageNumber}: ${p.text}`)
        .join("\n");

      const response = await fetch("/api/story/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyTitle: activeStory.title,
          previousPagesText,
          choiceSelected: choiceText,
          artStyle: activeStory.artStyle,
          ageGroup: activeStory.ageGroup,
          genre: activeStory.genre,
          startPageNumber: activeStory.pages.length + 1
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Branching wizard failed to extend.");
      }

      const data = await response.json();

      if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
        setMyStories(prevStories => {
          return prevStories.map(story => {
            if (story.id === activeStory.id) {
              const updatedPages = [...story.pages];
              
              // Backport selected choice onto preceding final page
              if (updatedPages[currentPageIndex]) {
                updatedPages[currentPageIndex] = {
                  ...updatedPages[currentPageIndex],
                  chosenOption: choiceText
                };
              }

              // Parse incoming extended sequential pages
              const mappedNewPages = data.pages.map((p: any) => ({
                pageNumber: p.pageNumber,
                text: p.text,
                visualDescription: p.visualDescription,
                choices: p.choices,
                isImageLoading: false
              }));

              const nextTags = [...(story.tags || [])];
              if (!nextTags.includes("Ongoing")) {
                nextTags.push("Ongoing");
              }

              return {
                ...story,
                pages: [...updatedPages, ...mappedNewPages],
                tags: nextTags
              };
            }
            return story;
          });
        });

        // Redirect reader straight into the next page index
        const nextTargetIndex = activeStory.pages.length;
        setCurrentPageIndex(nextTargetIndex);
      } else {
        throw new Error("No extended sheets were woven by the AI.");
      }
    } catch (err: any) {
      console.error("Story branching error:", err);
      alert(`The star helper had a quick hiccup: ${err.message || 'connection draft'}. Try again!`);
    } finally {
      setIsExtendingStory(false);
      setExtendingChoice(null);
    }
  };

  // Convert Base64 payload into standard playable URL
  const playAudioFromBase64 = (base64Audio: string) => {
    stopCurrentAudio();
    setIsPlaying(true);
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;
    const audioObj = new Audio(audioDataUrl);
    audioRef.current = audioObj;

    // Simulate word highlight synced with play duration
    const words = activePage.text.split(" ");
    let currentIdx = 0;
    const intervalTime = (audioObj.duration || 4.5) * 1000 / words.length || 230;

    const highlightTimer = setInterval(() => {
      if (!audioRef.current || audioRef.current.paused) {
        clearInterval(highlightTimer);
        setHighlightWordIdx(null);
        return;
      }
      setHighlightWordIdx(currentIdx);
      currentIdx++;
      if (currentIdx >= words.length) {
        clearInterval(highlightTimer);
        setTimeout(() => setHighlightWordIdx(null), 800);
      }
    }, intervalTime);

    audioObj.play();
    audioObj.onended = () => {
      setIsPlaying(false);
      setHighlightWordIdx(null);
    };
    audioObj.onerror = (e) => {
      console.error("Audio playback error", e);
      setIsPlaying(false);
      setHighlightWordIdx(null);
    };
  };

  const handleReadAloud = async () => {
    if (isPlaying) {
      stopCurrentAudio();
      return;
    }

    // Try to use cached audioUrl if exists
    if (activePage.audioUrl) {
      playAudioFromBase64(activePage.audioUrl);
      return;
    }

    setIsTTSLoading(true);
    try {
      const response = await fetch("/api/story/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: activePage.text,
          voice: selectedVoice
        })
      });

      const data = await response.json();
      if (data.audio) {
        // Cache the base64 audio data for this story page in state
        const updatedStories = [...myStories];
        updatedStories[activeStoryIndex].pages[currentPageIndex].audioUrl = data.audio;
        setMyStories(updatedStories);

        playAudioFromBase64(data.audio);
      } else {
        alert(data.error || "A gold whisper wind block could not find its speech potion. Try again!");
      }
    } catch (err: any) {
      console.error(err);
      alert("Uh oh! The reading fairy is resting её wings. Let's try once more!");
    } finally {
      setIsTTSLoading(false);
    }
  };

  // Generate Image for page if it's missing or re-magic requested
  const handleGenerateIllustration = async (pageIdx: number, force: boolean = false) => {
    const pageToIllustrate = activeStory.pages[pageIdx];
    if (!pageToIllustrate) return;

    if (!force && pageToIllustrate.imageUrl) {
      return; // Already loaded!
    }

    // Update state to render loader
    const updatingStoriesBefore = [...myStories];
    updatingStoriesBefore[activeStoryIndex].pages[pageIdx].isImageLoading = true;
    setMyStories(updatingStoriesBefore);

    try {
      const response = await fetch("/api/story/illustrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: pageToIllustrate.visualDescription,
          artStyle: activeStory.artStyle,
          imageSize: activeStory.imageSize || imageSize
        })
      });

      const data = await response.json();
      if (data.imageUrl) {
        const updatingStoriesAfter = [...myStories];
        updatingStoriesAfter[activeStoryIndex].pages[pageIdx].imageUrl = data.imageUrl;
        updatingStoriesAfter[activeStoryIndex].pages[pageIdx].isImageLoading = false;
        setMyStories(updatingStoriesAfter);
      } else {
        throw new Error(data.error || "No illustration potion could form standard canvas art.");
      }
    } catch (err) {
      console.error("Illustration failure:", err);
      // Fallback placeholder with cute kids graphic
      const updatingStoriesAfter = [...myStories];
      updatingStoriesAfter[activeStoryIndex].pages[pageIdx].isImageLoading = false;
      setMyStories(updatingStoriesAfter);
    }
  };

  // Automated first-run background image trigger when paging
  useEffect(() => {
    if (activeStory && activeStory.pages[currentPageIndex] && !activeStory.pages[currentPageIndex].imageUrl) {
      handleGenerateIllustration(currentPageIndex, false);
    }
  }, [currentPageIndex, activeStoryIndex]);

  // Create customized storybook from scratch using model gemini-3.5-flash
  const handleCreativeGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      alert("Please write a small sentence dreaming of what your story will be about!");
      return;
    }

    setIsGeneratingStory(true);
    setGenerationStep("Brewing magical text pages from the sky...");

    try {
      const storyResponse = await fetch("/api/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          genre: selectedGenre,
          ageGroup: selectedAge,
          pageCount,
          artStyle: selectedArtStyle
        })
      });

      if (!storyResponse.ok) {
        const errData = await storyResponse.json();
        throw new Error(errData.error || "Story generation spell fizzled.");
      }

      const freshStory = await storyResponse.json();

      // Add default metadata parameters
      const completeNewStory: Story = {
        id: `story-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: freshStory.title || "The Mysterious Adventure",
        artStyle: selectedArtStyle,
        ageGroup: selectedAge,
        genre: selectedGenre,
        topic: topic,
        imageSize: imageSize,
        isFavorite: false,
        tags: ["Kid Original", selectedGenre],
        customNotes: "",
        createdAt: new Date().toLocaleDateString(),
        pages: freshStory.pages.map((p: any) => ({
          pageNumber: p.pageNumber,
          text: p.text,
          visualDescription: p.visualDescription,
          choices: p.choices || undefined,
          isImageLoading: false
        }))
      };

      // Append next created index
      const nextStories = [completeNewStory, ...myStories];
      setMyStories(nextStories);
      setActiveStoryIndex(0);
      setCurrentPageIndex(0);

      setGenerationStep("Generating the first sparkling illustration...");

      // Instantly start the background illustration loader for Page 1 of new story
      setIsGeneratingStory(false);
      setCurrentView("book");

    } catch (err: any) {
      console.error(err);
      alert(`The star wizard had a sneeze! error: ${err.message || 'Server timeout'}. Try again soon!`);
      setIsGeneratingStory(false);
    }
  };

  // Submit dynamic multi-turn chats
  const sendChatMessage = async () => {
    if (!chatInputValue.trim()) return;

    const userText = chatInputValue;
    setChatInputValue("");

    const newMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: userText,
      timestamp: new Date()
    };

    // Update active buddy collection locally
    const buddyHistory = [...(chatMessages[activeBuddy] || [])];
    const updatedHistory = [...buddyHistory, newMsg];

    setChatMessages(prev => ({
      ...prev,
      [activeBuddy]: updatedHistory
    }));

    setIsChatLoading(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedHistory,
          buddyRole: activeBuddy,
          storyContext: `Story Title: "${activeStory.title}". Reading Page ${currentPageIndex + 1} with text: "${activePage.text}". Genre is ${activeStory.genre} written for kids aged ${activeStory.ageGroup}.`
        })
      });

      const data = await resp.json();
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: data.text || "I loved listening to your question!",
        timestamp: new Date()
      };

      setChatMessages(prev => ({
        ...prev,
        [activeBuddy]: [...updatedHistory, assistantMsg]
      }));

    } catch (err) {
      console.error("Buddy server slip-up:", err);
      // fallback kid friendly response
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: "My starlight signals wobbled. Could you ask me that one more time?",
        timestamp: new Date()
      };
      setChatMessages(prev => ({
        ...prev,
        [activeBuddy]: [...updatedHistory, errMsg]
      }));
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleBuddySuggestedPrompt = (promptText: string) => {
    setChatInputValue(promptText);
  };

  // Re-Magic illustrations triggers
  const handleReMagic = () => {
    handleGenerateIllustration(currentPageIndex, true);
  };

  // Voice configurations and icons
  const voices = [
    { id: "Puck", label: "Puck (Energetic Fox)", preview: "🦊" },
    { id: "Charon", label: "Charon (Cosmic Wizard)", preview: "🧙" },
    { id: "Kore", label: "Kore (Friendly Pixie)", preview: "🧚" },
    { id: "Fenrir", label: "Fenrir (Soft Giant)", preview: "🐾" },
    { id: "Zephyr", label: "Zephyr (Gentle Wind)", preview: "🍃" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDF0] to-[#FFF9D0] font-sans text-slate-800 flex flex-col antialiased">
      
      {/* Top Playful Header */}
      <header className="h-20 bg-white border-b-4 border-amber-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setCurrentView("library")}
            className="w-12 h-12 bg-pink-400 rounded-2xl flex items-center justify-center shadow-[0_4px_0_0_#be185d] cursor-pointer hover:bg-pink-300 transition-transform active:translate-y-1 active:shadow-none"
            id="logo-brand-icon"
          >
            <span className="text-2xl text-white transform hover:scale-110 block">📖</span>
          </div>
          <div>
            <h1 
              onClick={() => setCurrentView("library")}
              className="text-2xl md:text-3xl font-black text-amber-600 tracking-tight cursor-pointer hover:text-amber-700 transition"
              id="app-title-text"
            >
              StoryBuddy
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-[#E67E22] font-black -mt-1">
              Read &times; Paint &times; Play
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-3 md:gap-4">
          
          {/* Voice selector affordance */}
          {currentView === "book" && (
            <div className="hidden sm:flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-full border-2 border-amber-200 text-xs font-bold text-amber-800">
              <span className="opacity-70">Voice:</span>
              <select 
                value={selectedVoice} 
                onChange={(e) => {
                  setSelectedVoice(e.target.value);
                  stopCurrentAudio(); // halt current playing if speaker changes
                }}
                className="bg-transparent border-none outline-none font-extrabold text-amber-900 cursor-pointer"
              >
                {voices.map(v => (
                  <option key={v.id} value={v.id}>{v.preview} {v.id}</option>
                ))}
              </select>
            </div>
          )}

          {/* New Book Wand Button */}
          <button 
            onClick={() => setCurrentView("creator")}
            className="px-4 py-2 bg-orange-400 hover:bg-orange-300 text-white font-black text-sm rounded-full shadow-[0_4px_0_0_#d35400] hover:shadow-[0_2px_0_0_#d35400] transition active:translate-y-1 active:shadow-none uppercase tracking-wide flex items-center gap-2"
            id="spark-creation-nav"
          >
            <Sparkles className="w-4 h-4 animate-pulse text-yellow-100" />
            <span className="hidden xs:inline">Make Magic Book</span>
            <span className="xs:hidden">New Book</span>
          </button>

          {/* Go Back to Bookshelf */}
          {currentView !== "library" && (
            <button 
              onClick={() => {
                stopCurrentAudio();
                setCurrentView("library");
              }}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-sm rounded-full shadow-[0_4px_0_0_#3f37c9] hover:shadow-[0_2px_0_0_#3f37c9] transition active:translate-y-1 active:shadow-none uppercase tracking-wide"
              id="library-nav-btn"
            >
              Bookshelf
            </button>
          )}
        </div>
      </header>

      {/* Main Container Layer */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 md:p-6 justify-center">
        
        {/* VIEW 1: BOOKSHELF LIBRARY */}
        {currentView === "library" && (
          <div className="space-y-8 animate-fade-in w-full text-center py-6">
            
            {/* Hero Card */}
            <div className="bg-white p-8 md:p-12 rounded-[40px] border-4 border-amber-200 shadow-xl max-w-4xl mx-auto space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full blur-3xl -z-10 opacity-70"></div>
              <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-pink-100 rounded-full blur-3xl -z-10 opacity-70"></div>

              <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-600 px-4 py-2 rounded-full font-extrabold text-sm uppercase tracking-wider">
                <Sparkles className="w-4 h-4 animate-spin text-pink-500" />
                Next Generation Children's Book Creator
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-slate-800 leading-tight">
                Dream a story, and watch it paint inside <span className="text-pink-500 underline decoration-pink-300 decoration-wavy">Real-Time</span>
              </h2>

              <p className="text-base md:text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
                Choose any wonderful story from our magical book-wheel, or click the starry wand to compose your own storybook tailored to any age!
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <button
                  onClick={() => setCurrentView("creator")}
                  className="px-8 py-5 bg-pink-500 hover:bg-pink-400 text-white font-black text-lg md:text-xl rounded-[28px] shadow-[0_8px_0_0_#be185d] hover:shadow-[0_4px_0_0_#be185d] transition active:translate-y-1 active:shadow-none uppercase tracking-wide flex items-center gap-3"
                  id="create-new-magical-backpack"
                >
                  <Wand2 className="w-6 h-6 text-yellow-200" />
                  Compose New Storybook!
                </button>
              </div>
            </div>

            {/* Presets and Custom Books section with rich filter options */}
            <div className="space-y-6 max-w-6xl mx-auto text-left">
              
              {/* Library Control Dashboard: Search, Categories & Shelves */}
              <div className="bg-white p-6 rounded-[32px] border-4 border-amber-100 shadow-md space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between">
                  <div className="space-y-1 my-auto">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                      <span>📖</span> Find Your Tales
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                      Organize, name, and revisit your saved stories
                    </p>
                  </div>

                  {/* High Quality Search input box built specifically for small kids/parents */}
                  <div className="flex-1 max-w-md relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search story themes, puppies, astronauts..."
                      className="w-full text-xs font-bold p-3.5 pl-4 pr-10 rounded-2xl border-2 border-amber-50 focus:border-pink-400 outline-none transition bg-amber-50/20 focus:bg-white text-slate-800 font-sans"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-3.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Horizontal Category Shelves / Tags Filter Panel */}
                <div className="space-y-2 pt-1 border-t border-amber-100">
                  <span className="text-[10px] text-amber-700 font-extrabold uppercase tracking-widest block">
                    📁 Filter Bookshelf Shelves:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {["All", "Favorites", "Classic", "Bedtime", "Adventure", "Silly Fun", "Ongoing", "Completed", "Kid Original"].map(tag => {
                      const isSelected = selectedFilterTag === tag;
                      return (
                        <button
                          key={tag}
                          onClick={() => setSelectedFilterTag(tag)}
                          className={`text-xs px-3.5 py-2 rounded-full font-black border transition-all transform active:scale-95 ${
                            isSelected 
                              ? "bg-amber-400 border-amber-400 text-amber-950 shadow-sm" 
                              : "bg-amber-50/30 hover:bg-amber-50 border-amber-100 text-slate-600"
                          }`}
                        >
                          {tag === "Favorites" ? "❤️ " : tag === "Classic" ? "🧙 " : ""} {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Header result line */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🪄</span>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight text-left">
                    {selectedFilterTag === "All" ? "Your Entire Magical Back-catalogue" : `${selectedFilterTag} Shelf`}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">
                  {filteredStories.length} Books Found
                </span>
              </div>

              {/* Books list grid layout */}
              {filteredStories.length === 0 ? (
                <div className="bg-white border-4 border-amber-100 rounded-[36px] p-12 text-center space-y-4 max-w-xl mx-auto">
                  <span className="text-5xl block animate-bounce">⛺</span>
                  <h4 className="text-xl font-bold text-amber-900">This shelf is currently whispering for stories!</h4>
                  <p className="text-xs text-slate-500 font-medium">No files matched your filter query. Create a custom book, write an illustration, or choose other shelf tags!</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedFilterTag("All");
                    }}
                    className="px-4 py-2 bg-pink-500 text-white font-black text-xs rounded-xl uppercase tracking-wider"
                  >
                    Reset Shelves
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStories.map((story) => {
                    const defaultImg = "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80";
                    // Find first generated page image or default
                    const coverImage = story.pages[0]?.imageUrl || defaultImg;
                    const isPreset = story.id.startsWith("preset-");

                    // Find actual story index in the myStories master array to preserve indexing
                    const masterIdx = myStories.findIndex(s => s.id === story.id);

                    return (
                      <div 
                        key={story.id}
                        className="bg-white rounded-[32px] border-4 border-amber-100 p-5 hover:border-pink-300 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group relative overflow-hidden"
                        id={`storybook-card-${story.id}`}
                      >
                        {/* Interactive heart button to toggle favorites instantly */}
                        <button
                          onClick={(e) => handleToggleFavorite(story.id, e)}
                          className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition hover:scale-110 active:scale-95 ${
                            story.isFavorite 
                              ? "bg-rose-500 text-white shadow-md shadow-rose-200" 
                              : "bg-white/90 hover:bg-white text-slate-400 border border-slate-100"
                          } z-10`}
                          title="Favorite this book"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        </button>

                        {/* Stylized Badge (Preset or Custom) */}
                        {isPreset ? (
                          <div className="absolute top-3 right-3 bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider z-10 border border-teal-200">
                            Classic Buddy
                          </div>
                        ) : (
                          <div className="absolute top-3 right-3 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider z-10 border border-indigo-200">
                            Your Spell
                          </div>
                        )}

                        {/* Image preview of cover */}
                        <div className="w-full h-44 bg-amber-50 rounded-2xl overflow-hidden relative mb-4 border border-slate-100">
                          {story.pages[0]?.imageUrl ? (
                            <img 
                              src={coverImage} 
                              alt={story.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-orange-100 via-pink-100 to-indigo-100 flex flex-col items-center justify-center p-4 text-center">
                              <span className="text-4xl animate-bounce mb-2">✨</span>
                              <span className="text-xs font-black text-rose-800 uppercase tracking-wider">Unpainted Spellbook</span>
                              <span className="text-[10px] text-slate-500 line-clamp-1 px-4">{story.pages[0]?.visualDescription}</span>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[10px] font-bold">
                            {story.pages.length} Pages
                          </div>
                        </div>

                        {/* Info & Title */}
                        <div className="flex-1 text-left space-y-2">
                          <span className="text-xs font-black text-pink-500 uppercase tracking-widest block font-sans">
                            {story.genre} &middot; Age {story.ageGroup}
                          </span>
                          
                          <h4 className="text-xl font-bold text-slate-800 leading-tight group-hover:text-pink-500 transition line-clamp-2">
                            {story.title}
                          </h4>
                          
                          <p className="text-xs text-slate-500 line-clamp-2 font-medium">
                            {story.pages[0]?.text || story.topic}
                          </p>

                          {/* Render custom tag pills */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {story.tags?.map((t, tid) => (
                              <span key={tid} className="bg-slate-100 hover:bg-slate-200 text-[9px] text-slate-600 px-2 py-0.5 rounded-md font-extrabold uppercase transition-all">
                                📁 {t}
                              </span>
                            ))}
                          </div>

                          {/* Parents review diaries/notes preview */}
                          {story.customNotes && (
                            <div className="bg-yellow-50/70 border border-yellow-200 rounded-xl p-2.5 text-[11px] leading-relaxed text-yellow-850 font-extrabold italic line-clamp-2">
                              ✏️ Diary: &quot;{story.customNotes}&quot;
                            </div>
                          )}
                        </div>

                        {/* Play and Organize actions */}
                        <div className="pt-4 mt-auto space-y-2">
                          
                          <div className="flex gap-2">
                            {/* Open Book */}
                            <button
                              onClick={() => {
                                if (masterIdx !== -1) {
                                  setActiveStoryIndex(masterIdx);
                                  setCurrentPageIndex(0);
                                  setCurrentView("book");
                                }
                              }}
                              className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black rounded-xl border-b-4 border-amber-600 transition active:translate-y-0.5 active:border-b-2 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                            >
                              <BookOpen className="w-4 h-4" />
                              Read Aloud
                            </button>

                            {/* Organize details button */}
                            <button
                              onClick={(e) => handleOpenEditModal(story, e)}
                              className="px-3 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-xl border border-indigo-200 transition text-xs flex items-center justify-center cursor-pointer"
                              title="Organize Details, Rename & Add Notes"
                            >
                              ⚙️
                            </button>
                          </div>

                          {!isPreset && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to return this story to the library tree?")) {
                                  const copy = [...myStories];
                                  const realIndex = copy.findIndex(s => s.id === story.id);
                                  if (realIndex !== -1) {
                                    copy.splice(realIndex, 1);
                                    setMyStories(copy);
                                    setActiveStoryIndex(0);
                                  }
                                }
                              }}
                              className="w-full text-center text-[10px] text-red-400 hover:text-red-500 transition font-bold block pt-1 hover:underline cursor-pointer"
                            >
                              Unsummon Storybook
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: SPARK CREATOR (Wiz Form) */}
        {currentView === "creator" && (
          <div className="max-w-3xl w-full mx-auto bg-white rounded-[40px] border-4 border-amber-200 shadow-2xl p-6 md:p-10 relative overflow-hidden animate-fade-in my-4">
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-purple-100 rounded-full blur-3xl -z-10 opacity-70"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-100 rounded-full blur-3xl -z-10 opacity-70"></div>

            <div className="text-center space-y-3 mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 border-2 border-yellow-300 rounded-2xl text-3xl animate-bounce mb-2">
                🧙‍♂️
              </div>
              <h3 className="text-3xl font-black text-amber-600 tracking-tight">Magical Story Generator</h3>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                Tell our storytelling fairies what magical characters, lessons, or silly tasks you want to hear, and they'll write the script instantly!
              </p>
            </div>

            {isGeneratingStory ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                {/* Whimsical loader graphics */}
                <div className="relative w-28 h-28">
                  <div className="absolute inset-0 rounded-full border-8 border-amber-100"></div>
                  <div className="absolute inset-0 rounded-full border-8 border-pink-400 border-t-transparent animate-spin"></div>
                  <div className="absolute inset-4 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl animate-pulse">✨</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-slate-800 uppercase tracking-wider animate-pulse">
                    Crafting Storybook Spell...
                  </h4>
                  <p className="text-amber-600 font-extrabold max-w-md mx-auto text-sm px-4 bg-amber-100 py-1.5 rounded-full inline-block">
                    {generationStep}
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    This can take 10 to 20 seconds. Hand-painting your pages using Gemini AI!
                  </p>
                </div>

                <div className="w-full max-w-sm bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 animate-pulse" style={{ width: '85%' }}></div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreativeGeneration} className="space-y-6 text-left">
                
                {/* Prompt Topic Text Area */}
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>🌈 Who & What is this story about?</span>
                    <span className="text-xs text-slate-400 font-bold lowercase">Describe characters & goal</span>
                  </label>
                  <textarea
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., A tiny blue star helper who gets lost on a peanut butter sandwich moon, or a brave little puppy who wants to fly in an cardboard box rocket."
                    rows={3}
                    maxLength={250}
                    className="w-full p-4 rounded-2xl border-2 border-amber-100 focus:border-orange-400 outline-none text-sm font-medium transition"
                  />
                  
                  {/* Whimsical prompt assist buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs text-slate-400 font-bold self-center mr-1">Need ideas? Try:</span>
                    {[
                      "A small clumsy dragon who blows bubbles instead of fire",
                      "A fluffy kitty who wanted to learn cloud knitting",
                      "A tiny yellow train carrying happy cookies"
                    ].map((idea, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTopic(idea)}
                        className="bg-orange-50 hover:bg-orange-100 text-orange-700 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-orange-200 transition text-left"
                      >
                        ⚡ &quot;{idea}&quot;
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Art style of visuals */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
                      🎨 Dynamic Art Style
                    </label>
                    <select
                      value={selectedArtStyle}
                      onChange={(e) => setSelectedArtStyle(e.target.value)}
                      className="w-full p-3.5 rounded-xl border-2 border-amber-100 focus:border-pink-300 outline-none text-sm font-bold bg-white text-slate-800"
                    >
                      {ART_STYLES.map(style => (
                        <option key={style.id} value={style.name}>
                          {style.icon} {style.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Adventure Genre */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
                      🧭 Cozy Adventure Genre
                    </label>
                    <select
                      value={selectedGenre}
                      onChange={(e) => setSelectedGenre(e.target.value)}
                      className="w-full p-3.5 rounded-xl border-2 border-amber-100 focus:border-pink-300 outline-none text-sm font-bold bg-white text-slate-800"
                    >
                      {GENRES.map(g => (
                        <option key={g.id} value={g.name}>
                          {g.icon} {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reading Age selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
                      👶 Reader Age Group
                    </label>
                    <select
                      value={selectedAge}
                      onChange={(e) => setSelectedAge(e.target.value)}
                      className="w-full p-3.5 rounded-xl border-2 border-amber-100 focus:border-pink-300 outline-none text-sm font-bold bg-white"
                    >
                      {AGE_GROUPS.map(age => (
                        <option key={age.id} value={age.name}>
                          {age.name} &mdash; {age.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Total pages */}
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-slate-700 uppercase tracking-wider flex justify-between">
                      <span>📖 How many pages?</span>
                      <span className="text-pink-600 font-extrabold">{pageCount} Pages</span>
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={6}
                      step={1}
                      value={pageCount}
                      onChange={(e) => setPageCount(parseInt(e.target.value))}
                      className="w-full accent-pink-500 h-2 bg-slate-100 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 font-bold px-1">
                      <span>2 (Quick)</span>
                      <span>4 (Balanced)</span>
                      <span>6 (Full Adventure)</span>
                    </div>
                  </div>
                </div>

                {/* IMAGE QUALITY AFFORDANCE (1K, 2K, 4K) as explicitly mandated! */}
                <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-200 mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-amber-700" />
                        Illustration Quality settings
                      </h4>
                      <p className="text-xs text-amber-700 font-medium">
                        Specify painting scale for gemini-3-pro-image-preview
                      </p>
                    </div>
                    {/* Visual toggle chips */}
                    <div className="flex gap-2 bg-white p-1 rounded-xl border border-amber-200">
                      {(["1K", "2K", "4K"] as const).map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setImageSize(size)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                            imageSize === size 
                              ? "bg-pink-500 text-white shadow-sm" 
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-normal font-medium">
                    {imageSize === "1K" && "💡 1K configuration provides speedy paint loads. Perfect for fast reading blocks."}
                    {imageSize === "2K" && "🌟 2K configuration renders high-fidelity lines. Great balance of art detail and loading speed."}
                    {imageSize === "4K" && "👑 4K ultra-fine resolution delivers deep-painting textures. Recommended for shared tablet previews!"}
                  </p>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-pink-500 hover:bg-pink-400 text-white font-black text-xl rounded-2xl shadow-[0_6px_0_0_#be185d] transition active:translate-y-1 active:shadow-none uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Wand2 className="w-5 h-5" />
                    Wink a New Storybook!
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView("library")}
                    className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl transition border border-slate-200 text-sm"
                  >
                    Nevermind
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* VIEW 3: IMMERSIVE STORYBOOK READER (Dual-Pane) */}
        {currentView === "book" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-7xl mx-auto my-2 items-stretch animate-fade-in">
            
            {/* Story & Painting Left Area [8 columns on lg, or single-wide mobile] */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              
              {/* Image & Main illustration Stage */}
              <div className="bg-white rounded-[40px] border-8 border-white shadow-xl relative overflow-hidden aspect-[4/3] flex flex-col items-stretch group min-h-[300px]">
                
                {/* Header title badge inside book reader */}
                <div className="absolute top-4 left-4 z-10 bg-white/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 max-w-[85%]">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight leading-normal truncate">
                    {activeStory.title}
                  </h3>
                  <p className="text-[10px] text-pink-600 font-extrabold uppercase tracking-widest -mt-0.5">
                    Art: {activeStory.artStyle} ({activeStory.imageSize || "1K"})
                  </p>
                </div>

                {/* If image is loading or nonexistent, show animated state */}
                {activePage.isImageLoading ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#E8F5E9] via-amber-50 to-[#E8F5E9] flex flex-col items-center justify-center p-8 space-y-4">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 border-6 border-pink-100 rounded-full"></div>
                      <div className="absolute inset-0 border-6 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="absolute inset-4 text-2xl flex items-center justify-center animate-bounce">🖌️</span>
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-wider animate-pulse">Painting with Dream Stardust...</h4>
                      <p className="text-xs text-slate-500 max-w-sm font-bold line-clamp-2 px-6">
                        Generating style: <span className="text-pink-600 font-black">{activeStory.artStyle}</span>
                      </p>
                    </div>
                  </div>
                ) : activePage.imageUrl ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={activePage.imageUrl} 
                      alt={`Illustration for Page ${currentPageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Quality badge indicator on picture */}
                    <span className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {activeStory.imageSize || "1K"} Ultra Digital Canvas
                    </span>

                    {/* Bottom Action overlay */}
                    <div className="absolute bottom-4 right-4 z-10 opacity-90 hover:opacity-100 transition-opacity">
                      <button
                        onClick={handleReMagic}
                        className="flex items-center gap-2 bg-white hover:bg-amber-50 text-purple-600 font-black text-xs px-3.5 py-2.5 rounded-2xl shadow-lg border border-purple-200 transition active:scale-95"
                        title="Re-run image prompt on Gemini for a different illustration style"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                        <span>Re-Magic Art</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-300 via-purple-300 to-pink-300 flex flex-col items-center justify-center p-8 text-center space-y-6">
                    {/* Beautiful canvas initial placeholder if not generated yet */}
                    <div className="relative w-36 h-36 bg-white/40 rounded-3xl border-4 border-dashed border-white/60 flex flex-col items-center justify-center">
                      <span className="text-6xl text-white transform hover:rotate-12 transition duration-300">💡</span>
                    </div>

                    <div className="space-y-2 px-6">
                      <h4 className="text-xl font-bold text-white uppercase tracking-wider">Empty Canvas!</h4>
                      <p className="text-sm font-medium text-white/95 max-w-md mx-auto">
                        This custom fantasy page needs to be painted. Click below to summon the Gemini AI illustration spell!
                      </p>
                      <button
                        onClick={() => handleGenerateIllustration(currentPageIndex, true)}
                        className="mt-2 px-6 py-3 bg-white text-pink-600 hover:bg-pink-50 font-black rounded-full shadow-lg transition uppercase text-xs tracking-wider inline-flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                        Paint Page Illustration Now
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Story Content Card */}
              <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-lg border-2 border-amber-100 flex flex-col space-y-6">
                
                {/* Story header breadcrumbs */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {activeStory.pages.map((_, i) => (
                      <span 
                        key={i} 
                        onClick={() => setCurrentPageIndex(i)}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          currentPageIndex === i ? "w-8 bg-pink-500" : "w-2 bg-slate-200 hover:bg-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                    Page {currentPageIndex + 1} of {activeStory.pages.length}
                  </span>
                </div>

                {/* Main Story Paragraph (Highlighted characters & spoken speech effect) */}
                <div className="space-y-4">
                  <h2 className="text-2xl md:text-3.5xl font-black text-slate-800 leading-snug">
                    {activePage.text.split(" ").map((word, wordIdx) => {
                      const isWordSpoken = highlightWordIdx === wordIdx;
                      return (
                        <span 
                          key={wordIdx} 
                          className={`inline-block mr-1.5 transition-all duration-150 ${
                            isWordSpoken 
                              ? "bg-yellow-300 text-slate-900 rounded-sm scale-110 px-1 font-extrabold translate-y-[-2px] shadow-sm"
                              : "text-slate-700"
                          }`}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </h2>

                  {/* Tiny kid prompt hint */}
                  <p className="text-xs text-slate-400 font-bold italic">
                    💡 Hint: Choose different voice characters in the top toolbar. You can pause or play narration!
                  </p>
                </div>

                {/* Narrative branching decision block if choices array exists */}
                {activePage.choices && activePage.choices.length > 0 && (
                  <div className="space-y-3 pt-2" id="story-decisions-container">
                    
                    {/* Render decision history if already selected */}
                    {activePage.chosenOption ? (
                      <div className="bg-[#EFFFFA] border-2 border-[#10B981]/25 p-4 rounded-3xl text-left space-y-1">
                        <span className="text-[10px] text-[#10B981] font-extrabold uppercase tracking-widest block">
                          🌟 Your Decision Path
                        </span>
                        <p className="text-sm font-black text-[#047857] leading-relaxed">
                          &ldquo;{activePage.chosenOption}&rdquo;
                        </p>
                      </div>
                    ) : (
                      // Present branching option buttons to steer story direction
                      <div className="bg-amber-50 rounded-[32px] border-3 border-amber-200 p-5 space-y-4 text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-pink-100 rounded-full blur-2xl -z-10 opacity-75"></div>
                        
                        <div className="space-y-1">
                          <span className="text-xs font-black text-amber-800 uppercase tracking-widest block">
                            🔮 Choose What Happens next?
                          </span>
                          <h4 className="text-sm font-black text-slate-700">
                            Select one path below to weave a brand new page!
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {activePage.choices.map((choice, cIdx) => {
                            const isThisChoiceLoading = extendingChoice === choice;
                            return (
                              <button
                                key={cIdx}
                                disabled={isExtendingStory}
                                onClick={() => handleChoiceSelection(choice)}
                                className={`p-3.5 rounded-2xl font-black text-left border-2 text-xs shadow-xs hover:shadow-none transition transform active:scale-95 flex items-start gap-2.5 cursor-pointer block w-full ${
                                  isExtendingStory
                                    ? isThisChoiceLoading
                                      ? "bg-pink-100 border-pink-400 text-pink-900 animate-pulse"
                                      : "opacity-40 bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                                    : "bg-white border-amber-200/80 hover:border-pink-300 text-amber-950 hover:bg-amber-50/40"
                                }`}
                              >
                                <span className="text-lg shrink-0">
                                  {cIdx === 0 ? "🎒" : cIdx === 1 ? "🦊" : "🚀"}
                                </span>
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-[#C27D38] uppercase font-bold tracking-widest block">
                                    Path Option {cIdx + 1}
                                  </span>
                                  <p className="leading-snug text-slate-800">{choice}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {isExtendingStory && (
                          <div className="text-center pt-2">
                            <span className="text-xs font-black text-pink-600 animate-pulse uppercase tracking-wider">
                              🧙‍♂️ Weaving your decision into the story thread...
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Read Aloud Trigger and pagination bar */}
                <div className="pt-2 flex flex-col sm:flex-row gap-4 items-stretch justify-between">
                  
                  {/* TTS Action Button */}
                  <button 
                    onClick={handleReadAloud}
                    disabled={isTTSLoading}
                    className={`flex-1 sm:max-w-xs flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-black text-lg uppercase tracking-tight transition shadow-lg active:translate-y-1 ${
                      isTTSLoading 
                        ? "bg-slate-400 cursor-not-allowed" 
                        : isPlaying 
                        ? "bg-rose-500 hover:bg-rose-400 shadow-[0_4px_0_0_#9f1239]" 
                        : "bg-emerald-500 hover:bg-emerald-400 shadow-[0_4px_0_0_#065f46]"
                    }`}
                    id="tts-read-aloud-button"
                  >
                    {isTTSLoading ? (
                      <span className="animate-spin text-xl">⏳</span>
                    ) : isPlaying ? (
                      <Pause className="w-5 h-5 fill-white" />
                    ) : (
                      <Volume2 className="w-5 h-5 animate-bounce" />
                    )}
                    <span>
                      {isTTSLoading 
                        ? "Fairy Speaking..." 
                        : isPlaying 
                        ? "Stop Reading" 
                        : "Read Aloud!"}
                    </span>
                  </button>

                  {/* Manual pagination controllers */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        stopCurrentAudio();
                        setCurrentPageIndex(prev => Math.max(prev - 1, 0));
                      }}
                      disabled={currentPageIndex === 0}
                      className="px-4 py-3 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl font-black text-sm uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    
                    {currentPageIndex < activeStory.pages.length - 1 ? (
                      <button
                        onClick={() => {
                          stopCurrentAudio();
                          setCurrentPageIndex(prev => Math.min(prev + 1, activeStory.pages.length - 1));
                        }}
                        className="px-6 py-3 bg-pink-500 hover:bg-pink-400 text-white font-black text-sm rounded-xl shadow-[0_4px_0_0_#be185d] transition active:translate-y-0.5 flex items-center gap-1.5 uppercase tracking-wide"
                      >
                        Next Page
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          stopCurrentAudio();
                          setCurrentView("library");
                        }}
                        className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-sm rounded-xl shadow-[0_4px_0_0_#3f37c9] transition active:translate-y-0.5 flex items-center gap-1.5 uppercase tracking-wide"
                      >
                        Yay, Finished!
                      </button>
                    )}
                  </div>

                </div>

              </div>

            </div>

            {/* Chat Buddy Interactive Panel [4 columns on lg] */}
            <div className="lg:col-span-4 flex flex-col bg-white rounded-[36px] border-4 border-amber-100 shadow-xl overflow-hidden min-h-[500px]">
              
              {/* Buddy selection tab */}
              <div className="bg-amber-50 border-b border-amber-100 p-3 text-center">
                <span className="text-[10px] text-[#D35400] font-black uppercase tracking-widest block mb-2">
                  Choose Your Story Buddy Companion
                </span>
                
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(STORIES_BUDDIES) as BuddyType[]).map((buddyKey) => {
                    const info = STORIES_BUDDIES[buddyKey];
                    const isSelected = activeBuddy === buddyKey;
                    return (
                      <button
                        key={buddyKey}
                        onClick={() => {
                          setActiveBuddy(buddyKey);
                          stopCurrentAudio();
                        }}
                        className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                          isSelected 
                            ? "bg-white border-pink-400 shadow-sm" 
                            : "bg-transparent border-transparent opacity-70 hover:opacity-100"
                        }`}
                        id={`buddy-selector-${buddyKey}`}
                      >
                        <span className="text-2xl">{info.avatar}</span>
                        <span className="text-xs font-black text-slate-800 leading-tight">{info.name}</span>
                        <span className="text-[9px] text-[#A0522D] font-bold uppercase leading-none mt-0.5">
                          {buddyKey === "Barnaby" ? "3.1 Pro" : buddyKey === "Penny" ? "3.5" : "Lite"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Buddy Bio Info header */}
              <div className="bg-amber-100/50 p-4 border-b border-amber-200/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shadow-xs border border-amber-200">
                  {STORIES_BUDDIES[activeBuddy].avatar}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-850 leading-none">
                    {STORIES_BUDDIES[activeBuddy].name} the {STORIES_BUDDIES[activeBuddy].roleTitle}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight mt-1 line-clamp-1">
                    {STORIES_BUDDIES[activeBuddy].description}
                  </p>
                </div>
              </div>

              {/* Chat Thread Messages Room */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FCFBF7] max-h-[350px] lg:max-h-[none]">
                
                {chatMessages[activeBuddy]?.map((msg) => {
                  const isAssistant = msg.role === "assistant";
                  return (
                    <div 
                      key={msg.id}
                      className={`flex gap-2 max-w-[85%] ${isAssistant ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                    >
                      {isAssistant && (
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs shrink-0 self-start">
                          {STORIES_BUDDIES[activeBuddy].avatar}
                        </div>
                      )}
                      
                      <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-xs ${
                        isAssistant 
                          ? "bg-white text-slate-800 border border-slate-100 rounded-tl-xs" 
                          : "bg-pink-500 text-white rounded-tr-xs"
                      }`}>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  );
                })}

                {isChatLoading && (
                  <div className="flex gap-2 max-w-[85%] mr-auto">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs animate-bounce shrink-0">
                      {STORIES_BUDDIES[activeBuddy].avatar}
                    </div>
                    <div className="p-3 bg-white text-slate-400 rounded-2xl rounded-tl-xs text-xs border border-slate-100 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[10px] font-bold">thinking of a fun reply...</span>
                    </div>
                  </div>
                )}
                
                <div ref={chatBottomRef} />
              </div>

              {/* Suggested child prompts suggestions chips */}
              <div className="bg-amber-50/50 p-2.5 border-t border-amber-100 flex flex-wrap gap-1.5">
                <span className="text-[9px] text-amber-900 font-extrabold uppercase tracking-wide self-center w-full mb-1">
                  💡 Spark helper questions:
                </span>
                {STORIES_BUDDIES[activeBuddy].suggestedPrompts.map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleBuddySuggestedPrompt(promptText)}
                    className="bg-white hover:bg-pink-100 text-[10px] text-slate-700 hover:text-pink-800 font-black px-2 py-1 rounded-lg border border-slate-100 hover:border-pink-300 transition text-left"
                  >
                    💬 {promptText}
                  </button>
                ))}
              </div>

              {/* Chat Input form box */}
              <div className="p-3 bg-white border-t border-amber-100 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInputValue}
                  onChange={(e) => setChatInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendChatMessage();
                    }
                  }}
                  placeholder={`Speak to ${STORIES_BUDDIES[activeBuddy].name}...`}
                  maxLength={150}
                  className="flex-1 p-2.5 rounded-xl bg-amber-50 focus:bg-white border border-amber-100 focus:border-pink-300 outline-none text-xs font-bold transition"
                />
                
                <button
                  onClick={sendChatMessage}
                  disabled={isChatLoading || !chatInputValue.trim()}
                  className="p-2.5 bg-pink-500 hover:bg-pink-400 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl shadow-sm transition active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Footer credits and state */}
      <footer className="footer-bar mt-auto bg-white py-6 border-t-2 border-amber-100 text-center px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-4">
          <p className="text-xs text-slate-500 font-bold">
            &copy; 2026 StoryBuddy &middot; powered with <span className="text-rose-500 animate-pulse">❤️</span> server-side Gemini AI models. Fits COPPA guidance.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Live AI Node Connected
            </span>
          </div>
        </div>
      </footer>

      {/* MODAL: Magical Library Card (Edit details) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="magical-library-card-modal">
          <div className="bg-white rounded-[36px] border-4 border-amber-300 max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
            >
              ✕
            </button>
            
            <div className="text-center space-y-2">
              <span className="text-4xl">📖</span>
              <h3 className="text-2xl font-extrabold text-amber-700 tracking-tight">Magical Library Card</h3>
              <p className="text-xs text-slate-500">Name, customize tags, and add diary reviews for your saved adventure!</p>
            </div>

            <div className="space-y-4 text-left">
              {/* Name/Rename */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider">✏️ Rename Storybook Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none text-sm font-bold bg-amber-50/10 focus:bg-white focus:border-amber-400 text-slate-800"
                  placeholder="Insert a magical title..."
                  maxLength={100}
                />
              </div>

              {/* Tag/Shelf checklist */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider">🏷️ Place on Shelf Folders (Select Tags)</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_ORGANIZER_TAGS.map(tag => {
                    const isSelected = editTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEditTags(editTags.filter(t => t !== tag));
                          } else {
                            setEditTags([...editTags, tag]);
                          }
                        }}
                        className={`text-[11px] px-3 py-1.5 rounded-full font-black border transition cursor-pointer ${
                          isSelected 
                            ? "bg-pink-500 border-pink-500 text-white animate-scale-in" 
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected ? "✦ " : ""}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parental review diaries & notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-wider">✍️ Parent & Kids Diary Notes / Spelling review</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none text-xs font-medium focus:border-amber-400 bg-amber-50/5 focus:bg-white"
                  placeholder="Add memories: 'Lucas read this twice', 'Excellent spelling words: starry observatory', or character reviews!"
                  rows={3}
                  maxLength={250}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveStoryDetails}
                className="flex-1 py-3 bg-pink-500 hover:bg-pink-400 hover:shadow-lg text-white font-black rounded-xl shadow-md uppercase text-xs tracking-wide transition transform active:scale-95 cursor-pointer"
              >
                💾 Save Library Details
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
