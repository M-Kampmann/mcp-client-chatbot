"use client";
import { useState, useMemo } from "react";
import {
  MCPServerConfig,
  MCPSseConfigZodSchema,
  MCPStdioConfigZodSchema,
} from "app-types/mcp";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import JsonView from "./ui/json-view";
import { toast } from "sonner";
import { safe, watchOk } from "ts-safe";
import { useRouter } from "next/navigation";
import { createDebounce, isNull, safeJSONParse } from "lib/utils";
import { handleErrorWithToast } from "ui/shared-toast";
import { mutate } from "swr";
import { Loader } from "lucide-react";
import {
  isMaybeMCPServerConfig,
  isMaybeSseConfig,
} from "lib/ai/mcp/is-mcp-config";
import { updateMcpClientAction } from "@/app/api/mcp/actions";
import { insertMcpClientAction } from "@/app/api/mcp/actions";

import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { z } from "zod";
import { useTranslations } from "next-intl";

interface MCPEditorProps {
  initialConfig?: MCPServerConfig;
  name?: string;
}

const STDIO_ARGS_ENV_PLACEHOLDER = `/** STDIO Example */
{
  "command": "node", 
  "args": ["index.js"],
  "env": {
    "OPENAI_API_KEY": "sk-...",
  }
}

/** SSE Example */
{
  "url": "https://api.example.com",
  "headers": {
    "Authorization": "Bearer sk-..."
  }
}`;

export default function MCPEditor({
  initialConfig,
  name: initialName,
}: MCPEditorProps) {
  const t = useTranslations();
  const shouldInsert = useMemo(() => isNull(initialName), [initialName]);
  const [isLoading, setIsLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const errorDebounce = useMemo(() => createDebounce(), []);

  // State for form fields
  const [name, setName] = useState<string>(initialName ?? "");
  const router = useRouter();
  const [config, setConfig] = useState<MCPServerConfig>(
    initialConfig as MCPServerConfig,
  );
  const [jsonString, setJsonString] = useState<string>(
    initialConfig ? JSON.stringify(initialConfig, null, 2) : "",
  );

  // Name validation schema
  const nameSchema = z.string().regex(/^[a-zA-Z0-9\-]+$/, {
    message: t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens"),
  });

  const validateName = (nameValue: string): boolean => {
    const result = nameSchema.safeParse(nameValue);
    if (!result.success) {
      setNameError(
        t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens"),
      );
      return false;
    }
    setNameError(null);
    return true;
  };

  const saveDisabled = useMemo(() => {
    return (
      name.trim() === "" ||
      isLoading ||
      !!jsonError ||
      !!nameError ||
      !isMaybeMCPServerConfig(config)
    );
  }, [isLoading, jsonError, nameError, config, name]);

  // Validate
  const validateConfig = (jsonConfig: unknown): boolean => {
    const result = isMaybeSseConfig(jsonConfig)
      ? MCPSseConfigZodSchema.safeParse(jsonConfig)
      : MCPStdioConfigZodSchema.safeParse(jsonConfig);
    if (!result.success) {
      handleErrorWithToast(result.error, "mcp-editor-error");
    }
    return result.success;
  };

  // Handle save button click
  const handleSave = async () => {
    // Perform validation
    if (!validateConfig(config)) return;
    if (!name) {
      return handleErrorWithToast(
        new Error(t("MCP.nameIsRequired")),
        "mcp-editor-error",
      );
    }

    if (!validateName(name)) {
      return handleErrorWithToast(
        new Error(t("MCP.nameMustContainOnlyAlphanumericCharactersAndHyphens")),
        "mcp-editor-error",
      );
    }

    safe(() => setIsLoading(true))
      .map(() =>
        shouldInsert
          ? insertMcpClientAction(name, config)
          : updateMcpClientAction(name, config),
      )
      .watch(() => setIsLoading(false))
      .ifOk(() => toast.success(t("MCP.configurationSavedSuccessfully")))
      .watch(watchOk(() => mutate("mcp-list")))
      .ifOk(() => router.push("/mcp"))
      .ifFail(handleErrorWithToast);
  };

  const handleConfigChange = (data: string) => {
    setJsonString(data);
    const result = safeJSONParse(data);
    errorDebounce.clear();
    if (result.success) {
      setConfig(result.value as MCPServerConfig);
      setJsonError(null);
    } else if (data.trim() !== "") {
      errorDebounce(() => {
        setJsonError(
          (result.error as Error)?.message ??
            JSON.stringify(result.error, null, 2),
        );
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Name field */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>

        <Input
          id="name"
          value={name}
          disabled={!shouldInsert}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value) validateName(e.target.value);
          }}
          placeholder={t("MCP.enterMcpServerName")}
          className={nameError ? "border-destructive" : ""}
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="config">Config</Label>
        </div>

        {/* Split view for config editor */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left side: Textarea for editing */}
          <div className="space-y-2">
            <Textarea
              id="config-editor"
              value={jsonString}
              onChange={(e) => handleConfigChange(e.target.value)}
              className="font-mono h-[40vh] resize-none overflow-y-auto"
              placeholder={STDIO_ARGS_ENV_PLACEHOLDER}
            />
          </div>

          {/* Right side: JSON view */}
          <div className="space-y-2">
            <div className="border border-input rounded-md p-4 h-[40vh] overflow-auto relative">
              <Label
                htmlFor="config-view"
                className="text-xs text-muted-foreground mb-2"
              >
                preview
              </Label>
              <JsonView data={config} initialExpandDepth={3} />
              {jsonError && jsonString && (
                <div className="absolute w-full bottom-0 right-0 px-2 pb-2 animate-in fade-in-0 duration-300">
                  <Alert variant="destructive" className="border-destructive">
                    <AlertTitle className="text-xs font-semibold">
                      Parsing Error
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      {jsonError}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <Button onClick={handleSave} className="w-full" disabled={saveDisabled}>
        {isLoading ? (
          <Loader className="size-4 animate-spin" />
        ) : (
          <span className="font-bold">{t("MCP.saveConfiguration")}</span>
        )}
      </Button>
    </div>
  );
}
