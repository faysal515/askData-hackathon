"use client";

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { Send, ImagePlus, X, Copy, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Inter } from "next/font/google";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { UrlInput } from "@/components/url-input";
import AskDataAvatar from "@/asset/askdata-avatar.svg";

const inter = Inter({ subsets: ["latin"] });

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  messageType?: "text" | "select_choices" | "chart";
  datasets?: Dataset[];
  isSystemMessage?: boolean;
}

interface Dataset {
  identifier: string;
  title: string;
  titlelear: string;
  url: string;
  format: "csv" | "json" | "xml" | string;
}

interface EmptyStateProps {
  onUrlSubmit: (datasets: Dataset[]) => void;
}

const MAX_CHARACTERS = 50000;

const EmptyState = ({ onUrlSubmit }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-4">
    <div className="text-6xl mb-6">👋</div>
    <h3 className="text-xl text-gray-700 mb-4">Ask me anything</h3>
    <p className="text-lg text-gray-600 mb-6 max-w-md">
      I'm here to assist you with any questions you have about the open data
    </p>
    <div className="w-full max-w-md">
      <UrlInput onSubmit={onUrlSubmit} />
    </div>
  </div>
);

const TypingIndicator = () => (
  <div className="flex items-center space-x-2 mb-4">
    <Avatar className="w-8 h-8">
      <AvatarImage src={AskDataAvatar.src} alt="AI Assistant" />
      <AvatarFallback>AI</AvatarFallback>
    </Avatar>
    <div className="flex space-x-1">
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "'0ms'" }}
      ></div>
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "'150ms'" }}
      ></div>
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "'300ms'" }}
      ></div>
    </div>
  </div>
);

const DatasetChoices = ({
  datasets,
  onSelect,
}: {
  datasets: Dataset[];
  onSelect: (dataset: Dataset) => void;
}) => (
  <div className="mt-4 space-y-2">
    {datasets.map((dataset) => (
      <button
        key={dataset.identifier}
        onClick={() => onSelect(dataset)}
        className="w-full text-left p-3 rounded-lg bg-white hover:bg-gray-50 
          border border-gray-200 transition-colors flex items-center justify-between group"
      >
        <div className="flex-1">
          <h4 className="font-medium text-sm text-gray-900">{dataset.title}</h4>
          <p className="text-xs text-gray-500 mt-1">
            Format: {dataset.format.toUpperCase()}
          </p>
        </div>
        <Send className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
      </button>
    ))}
  </div>
);

export function ChatWindowComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCharCount(input.length);
    adjustTextareaHeight();
  }, [input]);

  useEffect(() => {
    if (isTyping) {
      const timer = setTimeout(() => setIsTyping(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isTyping]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: input.trim(),
        sender: "user",
        timestamp: new Date(),
        isSystemMessage: false,
      };
      setMessages((prev) => [...prev, newMessage]);
      setInput("");
      setIsTyping(true);

      // Scroll after user message
      setTimeout(scrollToBottom, 100);

      // Simulate AI response
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            text: "I'm processing your request. Give me a moment.",
            sender: "ai",
            timestamp: new Date(),
            isSystemMessage: false,
          },
        ]);
        setIsTyping(false);
        setTimeout(scrollToBottom, 100);
      }, 2000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value;
    if (newInput.length <= MAX_CHARACTERS) {
      setInput(newInput);
    }
  };

  const copyToClipboard = (text: string, messageId: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEE dd MMM");
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach((message) => {
      const dateKey = formatMessageDate(message.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    return groups;
  };

  const handleUrlSubmit = (datasets: Dataset[]) => {
    console.log("Datasets submitted:", datasets);

    setMessages([
      {
        id: 1,
        text: "I've found the following datasets. Click on one to load its data:",
        sender: "ai",
        timestamp: new Date(),
        messageType: "select_choices",
        datasets: datasets,
        isSystemMessage: false,
      },
    ]);
  };

  const handleDatasetSelect = async (dataset: Dataset) => {
    setIsTyping(true);

    try {
      const response = await fetch("/api/dataset/load", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: dataset.url }),
      });

      if (!response.ok) {
        throw new Error("Failed to load dataset");
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: `Loading data from: ${dataset.title}`,
          sender: "ai",
          timestamp: new Date(),
          isSystemMessage: true,
        },
        {
          id: prev.length + 2,
          text: `I've loaded the data`,
          sender: "ai",
          timestamp: new Date(),
          isSystemMessage: true,
        },
      ]);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: "Sorry, I couldn't load the dataset. Please try again.",
          sender: "ai",
          timestamp: new Date(),
          isSystemMessage: true,
        },
      ]);
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsTyping(false);
    }
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="h-full w-full flex flex-col rounded-lg">
      {/* Header */}
      <div className="flex items-center p-4 border-b">
        <h1 className="font-semibold">Abu Dhabi Data Assistant</h1>
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          className={`flex justify-center items-center min-h-screen bg-background-gray p-4 ${inter.className}`}
        >
          <div className="w-full max-w-4xl h-[calc(100vh-6rem)] bg-background rounded-lg shadow-lg flex flex-col">
            <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <EmptyState onUrlSubmit={handleUrlSubmit} />
              ) : (
                <>
                  {Object.entries(groupedMessages).map(
                    ([date, dateMessages]) => (
                      <React.Fragment key={date}>
                        <div className="flex justify-center my-4">
                          <span className="bg-background-gray text-text-secondary text-xs px-2 py-1 rounded-full">
                            {date}
                          </span>
                        </div>
                        {dateMessages.map((message) => (
                          <div key={message.id}>
                            {message.isSystemMessage ? (
                              <div className="flex justify-center my-4">
                                <span className="bg-background-gray text-text-secondary text-xs px-2 py-1 rounded-full">
                                  {message.text}
                                </span>
                              </div>
                            ) : (
                              <div
                                className={`flex flex-col mb-4 group ${
                                  message.sender === "user"
                                    ? "items-end"
                                    : "items-start"
                                }`}
                              >
                                <div className="flex items-start">
                                  {message.sender === "ai" && (
                                    <Avatar className="mr-2">
                                      <AvatarImage
                                        src={AskDataAvatar.src}
                                        alt="AI Assistant"
                                      />
                                      <AvatarFallback>AI</AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div className="flex flex-col">
                                    <div
                                      className={`p-3 rounded-lg ${
                                        message.sender === "user"
                                          ? "bg-primary text-background"
                                          : "bg-background-gray text-text-primary"
                                      }`}
                                    >
                                      {message.text}
                                      {message.messageType ===
                                        "select_choices" &&
                                        message.datasets && (
                                          <DatasetChoices
                                            datasets={message.datasets}
                                            onSelect={handleDatasetSelect}
                                          />
                                        )}
                                    </div>
                                    <div className="flex items-center mt-1 text-xs text-text-secondary">
                                      <span>
                                        {formatDistanceToNow(
                                          message.timestamp,
                                          {
                                            addSuffix: true,
                                          }
                                        )}
                                      </span>
                                      {message.sender === "ai" && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className={`ml-2 h-6 w-6 p-0 hover:bg-transparent opacity-0 group-hover:opacity-100 transition-opacity ${
                                            copiedMessageId === message.id
                                              ? "bg-green-100"
                                              : ""
                                          }`}
                                          onClick={() =>
                                            copyToClipboard(
                                              message.text,
                                              message.id
                                            )
                                          }
                                        >
                                          <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                          <span className="sr-only">
                                            Copy message
                                          </span>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  {message.sender === "user" && (
                                    <Avatar className="ml-2">
                                      <AvatarImage
                                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Avatar_yellowfemale-PNum1DagwhzNfKUOqztueg5Ocpu5VC.png"
                                        alt="User"
                                      />
                                      <AvatarFallback>U</AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {isTyping && <TypingIndicator />}
                      </React.Fragment>
                    )
                  )}
                </>
              )}
            </ScrollArea>

            {/* Input area */}
            <div className="p-4">
              <div className="bg-background-gray rounded-lg p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Type your message..."
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="flex-grow bg-background min-h-[40px] max-h-[120px] overflow-y-auto resize-none rounded-lg"
                      style={{ height: "auto" }}
                      rows={1}
                      autoFocus
                    />
                    <Button
                      onClick={handleSend}
                      className="bg-primary hover:bg-primary/90 text-background self-end rounded-lg"
                      disabled={!input.trim()}
                    >
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Send</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
