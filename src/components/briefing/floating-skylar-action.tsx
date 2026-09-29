"use client";

import { ChevronsUpDown, LoaderCircle, Send, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type SkylarContext = {
  employeeId?: string;
  employeeName?: string;
  cardTitle?: string;
  cardBody?: string;
};

type SkylarMessage = {
  role: "user" | "assistant";
  text: string;
};

type EmployeeOption = {
  id: string;
  name: string;
  detail: string;
  summary: string | null;
};

type OpenSkylarEvent = CustomEvent<SkylarContext & { prompt?: string }>;

type SavedConversationResponse = {
  messages?: SkylarMessage[];
  error?: { message?: string };
};

type PeopleResponse = {
  employees?: EmployeeOption[];
  error?: { message?: string };
};

function SkylarMessageText({ text }: { text: string }) {
  const lines = text.replace(/\s+-\s+(?=\*\*)/g, "\n- ").split("\n");

  return (
    <div className="grid gap-2">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <span key={`space-${index}`} className="h-1" aria-hidden="true" />;
        if (trimmed.startsWith("#")) {
          return (
            <p key={`heading-${index}`} className="text-base font-semibold leading-6">
              {formatSkylarInline(trimmed.replace(/^#+\s*/, ""))}
            </p>
          );
        }
        const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numbered) {
          return (
            <div key={`number-${index}`} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
              <span className="font-semibold tabular-nums text-ink/55">{numbered[1]}.</span>
              <span>{formatSkylarInline(numbered[2])}</span>
            </div>
          );
        }
        if (trimmed.startsWith("- ")) {
          return (
            <div key={`bullet-${index}`} className="flex gap-2">
              <span className="mt-[0.65em] size-1.5 shrink-0 rounded-full bg-ink/45" aria-hidden="true" />
              <span>{formatSkylarInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={`line-${index}`}>{formatSkylarInline(trimmed)}</p>;
      })}
    </div>
  );
}

function formatSkylarInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

const starterPrompts = [
  "Help me prepare this conversation",
  "What should I save in the note?",
  "Make this sound calmer",
] as const;

function normalizePrompt(text: string) {
  return text.trim().toLowerCase().replace(/[.!?]+$/g, "");
}

function hasAskedPrompt(messages: SkylarMessage[], prompt: string) {
  const normalizedPrompt = normalizePrompt(prompt);
  return messages.some(
    (message) => message.role === "user" && normalizePrompt(message.text) === normalizedPrompt,
  );
}

function SkylarContextLoading() {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl bg-paper/[0.045] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.055)]">
      <span
        aria-hidden="true"
        className="block size-9 shrink-0 animate-pulse bg-[url('/brand/logo.png')] bg-[length:32px_29px] bg-center bg-no-repeat"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-paper">Restoring employee context</p>
        <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
          <span className="size-1.5 animate-bounce rounded-full bg-paper-3 [animation-delay:-220ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-paper-3 [animation-delay:-110ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-paper-3" />
        </div>
      </div>
    </div>
  );
}

export function FloatingSkylarAction() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [switchEmployeeQuery, setSwitchEmployeeQuery] = useState("");
  const [isEmployeeSearchOpen, setIsEmployeeSearchOpen] = useState(false);
  const [autoSelectedEmployeeId, setAutoSelectedEmployeeId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [context, setContext] = useState<SkylarContext>({});
  const [messages, setMessages] = useState<SkylarMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAutoPromptKeyRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const routeEmployeeId = pathname?.match(/^\/people\/([^/?#]+)/)?.[1]
    ? decodeURIComponent(pathname.match(/^\/people\/([^/?#]+)/)?.[1] ?? "")
    : null;

  useEffect(() => {
    setAutoSelectedEmployeeId(null);
  }, [pathname]);

  const filteredEmployees = employees
    .filter((employee) => {
      const query = employeeQuery.trim().toLowerCase();
      if (!query) return true;
      return `${employee.name} ${employee.detail}`.toLowerCase().includes(query);
    })
    .slice(0, 6);
  const filteredSwitchEmployees = employees
    .filter((employee) => {
      const query = switchEmployeeQuery.trim().toLowerCase();
      if (!query) return true;
      return `${employee.name} ${employee.detail}`.toLowerCase().includes(query);
    })
    .slice(0, 6);

  const selectedEmployeeLabel = context.employeeName?.trim() || employeeQuery.trim();

  const loadEmployees = useCallback(async () => {
    if (employees.length || isLoadingEmployees) return;
    setIsLoadingEmployees(true);
    try {
      const response = await fetch("/api/people", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as PeopleResponse | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Skylar could not load employees.");
      setEmployees(Array.isArray(payload?.employees) ? payload.employees : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Skylar could not load employees.");
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [employees.length, isLoadingEmployees]);

  const sendMessage = useCallback(async (text: string, messageContext = context) => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || isLoading) return;
    const submittedText = trimmed;

    setDraft("");
    setError("");
    setIsLoading(true);
    setMessages((current) => [...current, { role: "user", text: submittedText }, { role: "assistant", text: "" }]);

    try {
      const result = await fetch("/api/briefing/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: submittedText, ...messageContext }),
      });

      if (!result.ok || !result.body) {
        const payload = (await result.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message || "Skylar could not prepare this conversation.");
      }

      const reader = result.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          const parsed = JSON.parse(data) as { text?: string; error?: string };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            setMessages((current) => {
              const next = [...current];
              const last = next[next.length - 1];
              if (last?.role === "assistant") next[next.length - 1] = { ...last, text: last.text + parsed.text };
              return next;
            });
          }
        }

        if (done) break;
      }
    } catch (requestError) {
      setMessages((current) => current.filter((message, index) => !(index === current.length - 1 && message.role === "assistant" && !message.text)));
      setDraft((current) => current || submittedText);
      setError(requestError instanceof Error ? requestError.message : "Skylar could not prepare this conversation.");
    } finally {
      setIsLoading(false);
    }
  }, [context, isLoading]);

  const loadSavedContext = useCallback(async (nextContext: SkylarContext, prompt?: string) => {
    setContext(nextContext);
    setMessages([]);
    setError("");
    setIsLoadingHistory(true);
    let savedMessages: SkylarMessage[] = [];

    const params = new URLSearchParams();
    if (nextContext.employeeId) params.set("employeeId", nextContext.employeeId);
    if (nextContext.employeeName) params.set("employeeName", nextContext.employeeName);
    if (nextContext.cardTitle) params.set("cardTitle", nextContext.cardTitle);

    try {
      const response = await fetch(`/api/briefing/conversation?${params.toString()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as SavedConversationResponse | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "Skylar could not load saved context.");
      savedMessages = Array.isArray(payload?.messages) ? payload.messages : [];
      setMessages(savedMessages);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Skylar could not load saved context.");
    } finally {
      setIsLoadingHistory(false);
      if (prompt) {
        const autoPromptKey = [
          nextContext.employeeId ?? nextContext.employeeName ?? "no-employee",
          nextContext.cardTitle ?? "no-card",
          normalizePrompt(prompt),
        ].join(":");
        if (!hasAskedPrompt(savedMessages, prompt) && lastAutoPromptKeyRef.current !== autoPromptKey) {
          lastAutoPromptKeyRef.current = autoPromptKey;
          void sendMessage(prompt, nextContext);
        }
      }
    }
  }, [sendMessage]);

  function selectEmployee(employee: EmployeeOption) {
    const nextContext: SkylarContext = {
      employeeId: employee.id,
      employeeName: employee.name,
      cardTitle: `Advisor chat for ${employee.name}`,
      cardBody: employee.summary ?? employee.detail,
    };
    setEmployeeQuery(employee.name);
    setSwitchEmployeeQuery("");
    setIsEmployeeSearchOpen(false);
    void loadSavedContext(nextContext);
  }

  function openEmployeeSwitch() {
    setSwitchEmployeeQuery("");
    setIsEmployeeSearchOpen(true);
    void loadEmployees();
  }

  function renderEmployeePicker({
    compact = false,
    inputId = "skylar-employee-search",
  }: {
    compact?: boolean;
    inputId?: string;
  }) {
    return (
      <div className="relative z-10 rounded-2xl bg-paper/[0.045] p-3 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.055)]">
        <div className="flex items-center justify-between gap-3">
          <label className="font-mono text-[11px] uppercase text-paper-3" htmlFor={inputId}>
            Employee context
          </label>
          {compact && selectedEmployeeLabel && (
            <span className="truncate text-xs font-semibold text-paper-2">{selectedEmployeeLabel}</span>
          )}
        </div>
        <input
          id={inputId}
          value={employeeQuery}
          onFocus={openEmployeeSwitch}
          onChange={(event) => {
            setEmployeeQuery(event.target.value);
            setIsEmployeeSearchOpen(true);
          }}
          placeholder="Search existing employee..."
          className="mt-2 h-10 w-full rounded-lg border border-paper/10 bg-ink px-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/30"
        />
        {isEmployeeSearchOpen && (
          <div className="absolute left-3 right-3 top-[calc(100%-10px)] grid max-h-52 gap-1 overflow-y-auto rounded-xl border border-paper/10 bg-ink-2 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
            {isLoadingEmployees && <p className="px-2 py-2 text-sm text-paper-3">Loading employees...</p>}
            {!isLoadingEmployees && filteredEmployees.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => selectEmployee(employee)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  context.employeeId === employee.id
                    ? "bg-paper text-ink"
                    : "bg-paper/[0.045] text-paper-2 hover:bg-paper/[0.08] hover:text-paper"
                }`}
              >
                <span className="block font-semibold">{employee.name}</span>
                <span className="mt-0.5 block text-xs opacity-70">{employee.detail}</span>
              </button>
            ))}
            {!isLoadingEmployees && employeeQuery && filteredEmployees.length === 0 && (
              <p className="px-2 py-2 text-sm text-paper-3">No employees match that search.</p>
            )}
            {!isLoadingEmployees && !employeeQuery && filteredEmployees.length === 0 && (
              <p className="px-2 py-2 text-sm text-paper-3">No employees have been created yet.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderHeaderEmployeeDropdown(inputId: string) {
    return (
      <div className="rounded-2xl border border-paper/10 bg-ink-2 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        <label className="sr-only" htmlFor={inputId}>
          Search employee context
        </label>
        <input
          id={inputId}
          value={switchEmployeeQuery}
          onChange={(event) => setSwitchEmployeeQuery(event.target.value)}
          placeholder="Search employee..."
          className="h-10 w-full rounded-xl border border-paper/10 bg-ink px-3 text-sm text-paper outline-none placeholder:text-paper-3 focus:border-paper/30"
        />
        <div className="mt-2 grid max-h-52 gap-1 overflow-y-auto">
          {isLoadingEmployees && <p className="px-2 py-2 text-sm text-paper-3">Loading employees...</p>}
          {!isLoadingEmployees && filteredSwitchEmployees.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => selectEmployee(employee)}
              className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                context.employeeId === employee.id
                  ? "bg-paper text-ink"
                  : "bg-paper/[0.045] text-paper-2 hover:bg-paper/[0.08] hover:text-paper"
              }`}
            >
              <span className="block font-semibold">{employee.name}</span>
              <span className="mt-0.5 block text-xs opacity-70">{employee.detail}</span>
            </button>
          ))}
          {!isLoadingEmployees && switchEmployeeQuery && filteredSwitchEmployees.length === 0 && (
            <p className="px-2 py-2 text-sm text-paper-3">No employees match that search.</p>
          )}
          {!isLoadingEmployees && !switchEmployeeQuery && filteredSwitchEmployees.length === 0 && (
            <p className="px-2 py-2 text-sm text-paper-3">No employees have been created yet.</p>
          )}
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!isOpen || !routeEmployeeId || autoSelectedEmployeeId === routeEmployeeId || context.employeeId) {
      return;
    }

    if (!employees.length) {
      void loadEmployees();
      return;
    }

    const routeEmployee = employees.find((employee) => employee.id === routeEmployeeId);
    if (!routeEmployee) return;

    const nextContext: SkylarContext = {
      employeeId: routeEmployee.id,
      employeeName: routeEmployee.name,
      cardTitle: `Advisor chat for ${routeEmployee.name}`,
      cardBody: routeEmployee.summary ?? routeEmployee.detail,
    };
    setEmployeeQuery(routeEmployee.name);
    setAutoSelectedEmployeeId(routeEmployee.id);
    void loadSavedContext(nextContext);
  }, [autoSelectedEmployeeId, context.employeeId, employees, isOpen, loadEmployees, loadSavedContext, routeEmployeeId]);

  useEffect(() => {
    function handleOpen(event: Event) {
      const detail = (event as OpenSkylarEvent).detail;
      setIsOpen(true);
      void loadSavedContext(detail, detail.prompt);
    }

    window.addEventListener("skylar:open", handleOpen);
    return () => window.removeEventListener("skylar:open", handleOpen);
  }, [loadSavedContext]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          void loadEmployees();
        }}
        className="skylar-shimmer fixed bottom-5 right-5 z-30 grid size-12 place-items-center overflow-hidden rounded-2xl bg-ink-2 text-paper shadow-[0_18px_50px_rgba(0,0,0,0.36),inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.08)] transition-transform after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:bg-gradient-to-r after:from-transparent after:via-paper/20 after:to-transparent hover:-translate-y-0.5 md:bottom-5 md:right-5"
        aria-label="Ask Skylar"
      >
        <span
          aria-hidden="true"
          className="relative z-10 block size-8 bg-[url('/brand/logo.png')] bg-[length:28px_25px] bg-center bg-no-repeat"
        />
      </button>

      {isOpen && (
        <section className="fixed bottom-24 right-5 z-40 flex h-[min(640px,calc(100dvh-7rem))] max-h-[680px] w-[calc(100vw-2.5rem)] max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-paper/[0.08] bg-ink-2 shadow-[0_24px_80px_rgba(0,0,0,0.5)] md:bottom-24 md:right-6">
          <header className="flex items-start justify-between gap-4 border-b border-paper/[0.055] px-5 py-4">
            <div className="flex gap-3">
              <span
                aria-hidden="true"
                className="block size-10 shrink-0 bg-[url('/brand/logo.png')] bg-[length:34px_31px] bg-center bg-no-repeat"
              />
              <div className="min-w-0">
                <p className="text-base font-semibold text-paper">Skylar assistant</p>
                <p className="mt-1 text-sm leading-5 text-paper-3">Prepare the conversation, one thoughtful step at a time.</p>
              </div>
            </div>
            <div className="relative flex shrink-0 items-start gap-2">
              {messages.length > 0 && !isLoadingHistory && (
                <button
                  type="button"
                  onClick={() => {
                    if (isEmployeeSearchOpen) {
                      setIsEmployeeSearchOpen(false);
                      return;
                    }
                    openEmployeeSwitch();
                  }}
                  className="flex h-9 max-w-[190px] items-center gap-2 rounded-xl bg-paper/[0.045] px-3 text-left text-paper-2 transition-colors hover:bg-paper hover:text-ink"
                  aria-expanded={isEmployeeSearchOpen}
                  aria-controls="skylar-header-employee-switch"
                  aria-label="Switch employee context"
                >
                  <UserRound className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {selectedEmployeeLabel || "No employee"}
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0" aria-hidden="true" />
                </button>
              )}
              {messages.length > 0 && !isLoadingHistory && isEmployeeSearchOpen && (
                <div
                  id="skylar-header-employee-switch"
                  className="absolute right-11 top-11 z-30 w-[min(340px,calc(100vw-5rem))]"
                >
                  {renderHeaderEmployeeDropdown("skylar-employee-search-header")}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper/[0.045] text-paper-2 transition-colors hover:bg-paper hover:text-ink"
                aria-label="Close Skylar assistant"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {isLoadingHistory && (
              <SkylarContextLoading />
            )}
            {messages.length === 0 && !isLoadingHistory && (
              <>
                <div className="mb-5">
                  {renderEmployeePicker({ inputId: "skylar-employee-search" })}
                </div>
                <p className="text-sm leading-6 text-paper-2">I can help with wording, next steps, or what belongs in the record.</p>
                <div className="mt-4 grid gap-2">
                  {starterPrompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} className="border border-paper/[0.08] bg-paper/[0.04] px-4 py-3 text-left text-sm text-paper-2 transition-colors hover:bg-paper hover:text-ink">
                      {prompt}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="grid gap-4">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex items-end gap-2"}>
                  {message.role === "assistant" && (
                    <span aria-hidden="true" className="mb-1 block size-7 shrink-0 bg-[url('/brand/logo.png')] bg-[length:25px_23px] bg-center bg-no-repeat" />
                  )}
                  <div className={message.role === "user" ? "max-w-[84%] rounded-[14px] rounded-br-sm bg-paper/[0.09] px-4 py-3 text-sm leading-6 text-paper" : "max-w-[92%] rounded-[14px] rounded-bl-sm bg-paper px-5 py-4 text-[15px] leading-6 text-ink"}>
                    {message.text ? (message.role === "assistant" ? <SkylarMessageText text={message.text} /> : message.text) : (isLoading ? "Thinking..." : "")}
                  </div>
                </div>
              ))}
              {error && <p className="border-l-2 border-risk px-3 py-2 text-sm leading-6 text-risk">{error}</p>}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form
            className="border-t border-paper/[0.055] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(draft);
            }}
          >
            <label className="sr-only" htmlFor="skylar-chat-input">
              Message Skylar
            </label>
            <div className="flex items-end gap-2 rounded-xl bg-paper/[0.04] p-2 shadow-[inset_0_0_0_1px_rgba(244,239,231,0.055),inset_0_1px_0_rgba(244,239,231,0.035)]">
              <textarea
                id="skylar-chat-input"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                    return;
                  }
                  event.preventDefault();
                  void sendMessage(draft);
                }}
                rows={2}
                placeholder="Ask Skylar what to say next..."
                className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-paper outline-none placeholder:text-paper-3"
              />
              <button
                type="submit"
                disabled={isLoading || draft.trim().length < 3}
                className="grid size-11 shrink-0 place-items-center rounded-lg bg-paper text-ink transition-opacity hover:opacity-90 disabled:opacity-45"
                aria-label="Send message"
              >
                {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
