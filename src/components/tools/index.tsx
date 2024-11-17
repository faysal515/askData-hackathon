import { ToolInvocation } from "@/lib/tools";
import GeneratedChart from "./generated-chart";

export type ToolUiProps = {
  toolInvocation: ToolInvocation;
};

export function ToolUi({ toolInvocation }: ToolUiProps) {
  switch (toolInvocation.toolName) {
    case "generateChart":
      return <GeneratedChart toolInvocation={toolInvocation} />;
  }
  return null;
}
