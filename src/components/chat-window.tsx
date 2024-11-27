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
import { DbManager } from "@/lib/db";
import { copyToTable, getCSVPreview, insertToTable } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChartTypeRegistry } from "chart.js";
import GeneratedChart from "./tools/generated-chart";

const inter = Inter({ subsets: ["latin"] });

interface Message {
  id: number;
  text: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  messageType?: "text" | "select_choices" | "chart";
  isStatusMessage?: boolean;
  isDataMessage?: boolean;
  isInternal?: boolean;
  chartConfig?: {
    type: keyof ChartTypeRegistry;
    data: any;
    options: any;
  };
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

const TypingIndicator = ({ text }: { text?: string }) => (
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
    {text && <p className="text-xs text-gray-500 mt-1">{text}</p>}
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
    {datasets.map((dataset) => {
      const isDisabled = !dataset.url || dataset.format.toLowerCase() !== "csv";
      return (
        <button
          key={dataset.identifier}
          onClick={() => onSelect(dataset)}
          className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group ${
            isDisabled
              ? "bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed"
              : "bg-white hover:bg-gray-50 border border-gray-200"
          }`}
          disabled={isDisabled}
        >
          <div className="flex-1">
            <h4 className="font-medium text-sm text-gray-900">
              {dataset.title}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Format: {dataset.format.toUpperCase()}
            </p>
          </div>
          <Send
            className={`h-4 w-4 ${
              isDisabled
                ? "text-gray-300"
                : "text-gray-400 group-hover:text-gray-600"
            }`}
          />
        </button>
      );
    })}
  </div>
);

type ChatWindowProps = {
  dbManager?: DbManager;
};

export function ChatWindowComponent({ dbManager }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiMessages, setApiMessages] = useState<
    {
      role: "user" | "assistant";
      content: string;
    }[]
  >([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [input, setInput] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedTableSchema, setSelectedTableSchema] = useState<
    string[] | null
  >(null);
  const [analyticsQuestions, setAnalyticsQuestions] = useState<string[]>([]);

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
        const scrollHeight = scrollContainer.scrollHeight;
        const height = scrollContainer.clientHeight;
        const maxScrollTop = scrollHeight - height;

        scrollContainer.scrollTo({
          top: maxScrollTop,
          behavior: "smooth",
        });
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: input.trim(),
      role: "user",
      timestamp: new Date(),
      isStatusMessage: false,
    };

    // Update the state and then call the API
    setMessages((prev) => [...prev, newMessage]);
    setApiMessages((prev) => [
      ...prev,
      { role: "user", content: newMessage.text },
    ]);
    setInput("");

    // Scroll to bottom after sending message
    setTimeout(scrollToBottom, 100);

    // Construct payloadMessage after the state update
    // const payloadMessage = apiMessages.map((m) => ({
    //   role: m.role,
    //   content: m.content,
    // }));
    const payloadMessage = [...apiMessages];

    // Include the new message in the payload
    payloadMessage.push({
      role: "user",
      content: newMessage.text,
    });

    // Proceed with the API call
    await sendMessageToApi(payloadMessage);
  };

  const sendMessageToApi = async (payloadMessage: any) => {
    try {
      setIsTyping(true);
      console.log("Sending message:", input.trim());
      console.log(" >>> ", { payloadMessage, apiMessages });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schema: selectedTableSchema,
          messages: payloadMessage,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const parsed = JSON.parse(chunk);

        if (parsed.function_call_required) {
          if (parsed.sql_args) {
            // Handle SQL query case
            setTypingText("Calculating..."); // Set specific text for SQL operations
            const result = await dbManager?.execute(parsed.sql_args.sql);
            console.log("sql result >>> ", result);

            if (result && result[0].rows) {
              setMessages((prev) => [
                ...prev,
                {
                  id: prev.length + 1,
                  text: JSON.stringify(result[0].rows, null, 2),
                  role: "user",
                  timestamp: new Date(),
                  isStatusMessage: false,
                  isDataMessage: true,
                  isInternal: true,
                },
              ]);

              const newApiMessages = [
                {
                  role: "assistant",
                  content: `Please give me the result of your SQL query:\n\n${parsed.sql_args.sql}`,
                },
                {
                  role: "user",
                  content: JSON.stringify(result[0].rows, null, 2),
                },
              ];

              // @ts-ignore
              setApiMessages((prev) => [...prev, ...newApiMessages]);
              await sendMessageToApi([...payloadMessage, ...newApiMessages]);
            }
          } else if (parsed.chart_args) {
            setTypingText("Generating chart..."); // Set specific text for chart generation
            // Handle chart generation case
            setMessages((prev) => [
              ...prev,
              {
                id: prev.length + 1,
                text: "",
                role: "assistant",
                timestamp: new Date(),
                messageType: "chart",
                chartConfig: parsed.chart_args.config,
              },
            ]);

            // If there's accompanying content with the chart, send it as a separate message
            if (parsed.content) {
              setMessages((prev) => [
                ...prev,
                {
                  id: prev.length + 1,
                  text: parsed.content,
                  role: "assistant",
                  timestamp: new Date(),
                },
              ]);
            }
          }
        } else if (parsed.content) {
          setMessages((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              text: parsed.content,
              role: "assistant",
              timestamp: new Date(),
            },
          ]);
          setApiMessages((prev) => [
            ...prev,
            { role: "assistant", content: parsed.content },
          ]);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: "Sorry, there was an error processing your request.",
          role: "assistant",
          timestamp: new Date(),
          isStatusMessage: true,
        },
      ]);
    } finally {
      setIsTyping(false);
      setTimeout(scrollToBottom, 100);
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

  const handleUrlSubmit = (newDatasets: Dataset[]) => {
    console.log("Datasets submitted:", newDatasets);
    setDatasets(newDatasets);

    setMessages([
      {
        id: 1,
        text: "I've found the following datasets. Click on one to load its data:",
        role: "assistant",
        timestamp: new Date(),
        messageType: "select_choices",
        isStatusMessage: false,
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

      const csvData = await response.json();

      setTypingText("Getting your data ready...");
      setTimeout(scrollToBottom, 100);

      const tableResponse = await fetch("/api/chat/create-table", {
        method: "POST",
        body: JSON.stringify({
          preview: getCSVPreview(csvData.data),
          fileName: dataset.title,
        }),
      });

      const {
        sql,
        columns,
        tableName,
        dateColumns,
        numericColumns,
        analyticsQuestions,
      } = await tableResponse.json();
      const result = await dbManager?.execute(sql);
      console.log("table create result >>> ", result);

      const insertResult = await dbManager?.execute(
        insertToTable(
          tableName,
          csvData.data,
          columns,
          dateColumns,
          numericColumns
        )
      );
      console.log("insert to table result >>> ", insertResult);
      setTypingText("");
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: `${dataset.title} is ready!`,
          role: "assistant",
          timestamp: new Date(),
          isStatusMessage: true,
        },
      ]);
      setSelectedTableSchema(sql);
      setAnalyticsQuestions(analyticsQuestions || []);
    } catch (error) {
      console.error("Error loading dataset:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: "Sorry, I couldn't load the dataset. Please try again.",
          role: "assistant",
          timestamp: new Date(),
          isStatusMessage: true,
        },
      ]);
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuestionSelect = (question: string) => {
    setInput(question);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Add this useEffect to scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="h-full w-full flex flex-col rounded-lg">
      {/* <div className="flex items-center p-4 border-b">
        <h1 className="font-semibold">Abu Dhabi Data Assistant</h1>
      </div> */}

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
                  {messages
                    .filter(
                      (message) => !message.isInternal && !message.isDataMessage
                    )
                    .map((message) => (
                      <div key={message.id}>
                        {message.isStatusMessage ? (
                          <div className="flex justify-center my-4">
                            <span className="bg-background-gray text-text-secondary text-xs px-2 py-1 rounded-full">
                              {message.text}
                            </span>
                          </div>
                        ) : (
                          <div
                            className={`flex flex-col mb-4 group ${
                              message.role === "user"
                                ? "items-end"
                                : "items-start"
                            }`}
                          >
                            <div className="flex items-start">
                              {message.role === "assistant" && (
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
                                    message.role === "user"
                                      ? "bg-primary text-background"
                                      : "bg-background-gray text-text-primary"
                                  }`}
                                >
                                  {message.role === "assistant" ? (
                                    message.messageType === "select_choices" ? (
                                      <>
                                        {message.text}
                                        <DatasetChoices
                                          datasets={datasets}
                                          onSelect={handleDatasetSelect}
                                        />
                                      </>
                                    ) : message.messageType === "chart" &&
                                      message.chartConfig ? (
                                      <GeneratedChart
                                        config={message.chartConfig}
                                      />
                                    ) : (
                                      <ReactMarkdown
                                        className="prose prose-sm max-w-none"
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                          code: ({
                                            className,
                                            children,
                                            ...props
                                          }: React.HTMLProps<HTMLElement>) => (
                                            <code
                                              className={`${className} ${
                                                className?.includes("inline")
                                                  ? "bg-gray-100 rounded px-1"
                                                  : "block bg-gray-100 p-2 rounded-lg"
                                              }`}
                                              {...props}
                                            >
                                              {children}
                                            </code>
                                          ),
                                          a: ({ node, children, ...props }) => (
                                            <a
                                              className="text-blue-600 hover:underline"
                                              {...props}
                                            >
                                              {children}
                                            </a>
                                          ),
                                        }}
                                      >
                                        {message.text}
                                      </ReactMarkdown>
                                    )
                                  ) : (
                                    message.text
                                  )}
                                </div>
                              </div>
                              {message.role === "user" && (
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
                  {isTyping && <TypingIndicator text={typingText} />}
                </>
              )}
            </ScrollArea>

            <div className="p-4">
              {analyticsQuestions.length > 0 && (
                <div className="mb-4 flex gap-2">
                  {analyticsQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuestionSelect(question)}
                      className="flex-1 px-4 py-2 text-sm text-center bg-white hover:bg-gray-50 border border-gray-200 rounded-full transition-colors"
                      style={{ whiteSpace: "normal", wordWrap: "break-word" }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

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
                      disabled={
                        !input.trim() || isTyping || messages.length === 0
                      }
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
