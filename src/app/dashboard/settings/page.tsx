"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";

const SHIELDBASE_AWS_ACCOUNT_ID = "886821787192";
const CFN_TEMPLATE_URL = `https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=ShieldBaseReadOnly&templateURL=https://shieldbase-public-cfn.s3.amazonaws.com/cfn-shieldbase-readonly.json`;
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "Ov23lihUSDcOADRW0Kkw";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SLACK_CLIENT_ID = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID ?? "";
const SITE_ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://shieldbase.vercel.app";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.domain.readonly",
  "https://www.googleapis.com/auth/admin.directory.group.readonly",
  "https://www.googleapis.com/auth/admin.reports.audit.readonly",
].join(" ");

const SLACK_SCOPES = [
  "team:read",
  "users:read",
  "users:read.email",
  "admin.users:read",
  "admin.teams:read",
  "admin.conversations:read",
].join(",");

type Step = "choose" | "aws" | "github" | "google" | "slack" | "azure" | "done";

export default function ConnectPage() {
  const { org } = useOrg();
  const techStack = (org?.tech_stack ?? {}) as Record<string, string>;
  const awsConnected = !!techStack.aws_role_arn;
  const githubConnected = !!techStack.github_token;
  const azureConnected = !!techStack.azure_subscription_id || !!techStack.azure_access_token;
  const googleConnected = !!techStack.google_access_token;
  const slackConnected = !!techStack.slack_access_token;

  const awsAccountId = techStack.aws_role_arn ? (techStack.aws_role_arn.split(":")[4] ?? "") : "";
  const awsRoleName = techStack.aws_role_arn ? (techStack.aws_role_arn.split("/").pop() ?? "") : "";
  const githubLogin = techStack.github_login ?? "Connected";

  const [step, setStep] = useState<Step>("choose");
  const [arnInput, setArnInput] = useState("");
  const [arnSaved, setArnSaved] = useState(awsConnected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);

  const handleDisconnect = async (provider: string) => {
    if (disconnectConfirm === provider) {
      const t = { ...techStack };
      if (provider === "aws") { delete t.aws_role_arn; delete t.aws_connected_at; }
      if (provider === "github") { delete t.github_token; delete t.github_login; delete t.github_connected_at; }
      if (provider === "azure") { delete t.azure_access_token; delete t.azure_refresh_token; delete t.azure_token_expiry; delete t.azure_subscription_id; delete t.azure_tenant_id; delete t.azure_connected_at; }
      if (provider === "google") { delete t.google_access_token; delete t.google_refresh_token; delete t.google_token_expiry; delete t.google_domain; delete t.google_email; delete t.google_connected_at; }
      if (provider === "slack") { delete t.slack_access_token; delete t.slack_team_id; delete t.slack_team_name; delete t.slack_connected_at; }
      await supabase.from("organizations").update({ tech_stack: t }).eq("id", org!.id);
      window.location.reload();
    } else {
      setDisconnectConfirm(provider);
      setTimeout(() => setDisconnectConfirm(null), 3000);
    }
  };

  const handleScanNow = async (provider: string) => {
    try {
      const res = await fetch("/api/scan/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        alert(`${provider} scan triggered! Check the monitoring page in a few minutes.`);
      } else {
        alert("Scan trigger failed — try again from the monitoring page.");
      }
    } catch {
      alert("Scan trigger failed — try again from the monitoring page.");
    }
  };

  const saveArn = async () => {
    if (!arnInput.startsWith("arn:aws:iam::")) {
      setError("Invalid ARN format. Should look like: arn:aws:iam::123456789012:role/ShieldBaseReadOnly");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Not logged in");

      const res = await fetch("/api/connect/aws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_arn: arnInput,
          auth_token: sessionData.session.access_token,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");

      setArnSaved(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (step === "choose") {
    return (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Integrations</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Connect your cloud accounts and services so ShieldBase can automatically collect compliance evidence.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">

          {/* AWS */}
          <div className={`bg-[var(--color-bg)] rounded-2xl border p-6 ${awsConnected ? "border-[var(--color-success)] border-l-4 border-l-green-400" : "border-[var(--color-border)]"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl"></div>
                <div>
                  <div className="font-semibold text-[var(--color-foreground)]">Amazon Web Services</div>
                  <div className="text-xs text-[var(--color-muted)]">Cloud provider</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${awsConnected ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-xs font-medium ${awsConnected ? "text-[var(--color-success)]" : "text-[var(--color-muted)]"}`}>
                  {awsConnected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
            {awsConnected ? (
              <>
                <div className="bg-[var(--color-surface)] rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">Account ID</span>
                    <span className="font-mono font-medium text-[var(--color-foreground-subtle)]">{awsAccountId || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">Role</span>
                    <span className="font-mono font-medium text-[var(--color-foreground-subtle)] truncate max-w-[160px]">{awsRoleName || "—"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleScanNow("aws")}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 rounded-lg font-medium transition">
                    Scan Now
                  </button>
                  <button onClick={() => handleDisconnect("aws")}
                    className={`text-sm px-4 py-2 rounded-lg font-medium transition border ${
                      disconnectConfirm === "aws"
                        ? "bg-red-500 text-white border-red-500"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                    }`}>
                    {disconnectConfirm === "aws" ? "Confirm?" : "Disconnect"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--color-muted)] mb-4">Automatically scan your AWS infrastructure for IAM, S3, CloudTrail, RDS, and 100+ SOC 2 checks.</p>
                <button onClick={() => setStep("aws")}
                  className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white text-sm py-2.5 rounded-lg font-medium transition">
                  Connect AWS →
                </button>
              </>
            )}
          </div>

          {/* GitHub */}
          <div className={`bg-[var(--color-bg)] rounded-2xl border p-6 ${githubConnected ? "border-[var(--color-success)] border-l-4 border-l-green-400" : "border-[var(--color-border)]"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--color-foreground)] rounded-xl flex items-center justify-center text-2xl"></div>
                <div>
                  <div className="font-semibold text-[var(--color-foreground)]">GitHub</div>
                  <div className="text-xs text-[var(--color-muted)]">Source control</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${githubConnected ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-xs font-medium ${githubConnected ? "text-[var(--color-success)]" : "text-[var(--color-muted)]"}`}>
                  {githubConnected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
            {githubConnected ? (
              <>
                <div className="bg-[var(--color-surface)] rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">Account</span>
                    <span className="font-medium text-[var(--color-foreground-subtle)]">@{githubLogin}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleScanNow("github")}
                    className="flex-1 bg-[var(--color-foreground)] hover:bg-gray-700 text-white text-sm py-2 rounded-lg font-medium transition">
                    Scan Now
                  </button>
                  <button onClick={() => handleDisconnect("github")}
                    className={`text-sm px-4 py-2 rounded-lg font-medium transition border ${
                      disconnectConfirm === "github"
                        ? "bg-red-500 text-white border-red-500"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                    }`}>
                    {disconnectConfirm === "github" ? "Confirm?" : "Disconnect"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--color-muted)] mb-4">Monitor branch protection, code reviews, 2FA enforcement, Dependabot alerts, and secret scanning across your repos.</p>
                <button onClick={() => setStep("github")}
                  className="block w-full text-center bg-[var(--color-foreground)] hover:bg-gray-700 text-white text-sm py-2.5 rounded-lg font-medium transition">
                  Connect GitHub →
                </button>
              </>
            )}
          </div>

          {/* Google Workspace */}
          <div className={`bg-[var(--color-bg)] rounded-2xl border p-6 ${googleConnected ? "border-[var(--color-success)] border-l-4 border-l-green-400" : "border-[var(--color-border)]"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--color-info-bg)] rounded-xl flex items-center justify-center text-2xl"></div>
                <div>
                  <div className="font-semibold text-[var(--color-foreground)]">Google Workspace</div>
                  <div className="text-xs text-[var(--color-muted)]">Identity provider</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${googleConnected ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-xs font-medium ${googleConnected ? "text-[var(--color-success)]" : "text-[var(--color-muted)]"}`}>
                  {googleConnected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
            {googleConnected ? (
              <>
                <div className="bg-[var(--color-surface)] rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">Domain</span>
                    <span className="font-medium text-[var(--color-foreground-subtle)] truncate max-w-[180px]">{techStack.google_domain || "—"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleScanNow("google_workspace")}
                    className="flex-1 bg-blue-600 hover:opacity-90 text-white text-sm py-2 rounded-lg font-medium transition">
                    Scan Now
                  </button>
                  <button onClick={() => handleDisconnect("google")}
                    className={`text-sm px-4 py-2 rounded-lg font-medium transition border ${
                      disconnectConfirm === "google"
                        ? "bg-red-500 text-white border-red-500"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                    }`}>
                    {disconnectConfirm === "google" ? "Confirm?" : "Disconnect"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--color-muted)] mb-4">Monitor user accounts, MFA enforcement, admin roles, and login activity across your Google Workspace org.</p>
                <button onClick={() => setStep("google")}
                  className="block w-full text-center bg-blue-600 hover:opacity-90 text-white text-sm py-2.5 rounded-lg font-medium transition">
                  Connect Google Workspace →
                </button>
              </>
            )}
          </div>

          {/* Slack */}
          <div className={`bg-[var(--color-bg)] rounded-2xl border p-6 ${slackConnected ? "border-[var(--color-success)] border-l-4 border-l-green-400" : "border-[var(--color-border)]"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl"></div>
                <div>
                  <div className="font-semibold text-[var(--color-foreground)]">Slack</div>
                  <div className="text-xs text-[var(--color-muted)]">Communication</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${slackConnected ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-xs font-medium ${slackConnected ? "text-[var(--color-success)]" : "text-[var(--color-muted)]"}`}>
                  {slackConnected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
            {slackConnected ? (
              <>
                <div className="bg-[var(--color-surface)] rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">Workspace</span>
                    <span className="font-medium text-[var(--color-foreground-subtle)] truncate max-w-[180px]">{techStack.slack_team_name || "—"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleScanNow("slack")}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 rounded-lg font-medium transition">
                    Scan Now
                  </button>
                  <button onClick={() => handleDisconnect("slack")}
                    className={`text-sm px-4 py-2 rounded-lg font-medium transition border ${
                      disconnectConfirm === "slack"
                        ? "bg-red-500 text-white border-red-500"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                    }`}>
                    {disconnectConfirm === "slack" ? "Confirm?" : "Disconnect"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--color-muted)] mb-4">Monitor workspace settings, SSO enforcement, data retention policies, and admin roles.</p>
                <button onClick={() => setStep("slack")}
                  className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white text-sm py-2.5 rounded-lg font-medium transition">
                  Connect Slack →
                </button>
              </>
            )}
          </div>

          {/* Microsoft Azure */}
          <div className={`bg-[var(--color-bg)] rounded-2xl border p-6 ${azureConnected ? "border-[var(--color-success)] border-l-4 border-l-green-400" : "border-[var(--color-border)]"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#0078D4]/10 rounded-xl flex items-center justify-center text-2xl"></div>
                <div>
                  <div className="font-semibold text-[var(--color-foreground)]">Microsoft Azure</div>
                  <div className="text-xs text-[var(--color-muted)]">Cloud provider</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${azureConnected ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-xs font-medium ${azureConnected ? "text-[var(--color-success)]" : "text-[var(--color-muted)]"}`}>
                  {azureConnected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
            {azureConnected ? (
              <>
                <div className="bg-[var(--color-surface)] rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--color-muted)]">Subscription</span>
                    <span className="font-mono font-medium text-[var(--color-foreground-subtle)] truncate max-w-[160px]">{techStack.azure_subscription_id || "—"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleScanNow("azure")}
                    className="flex-1 bg-[#0078D4] hover:bg-[#006cbd] text-white text-sm py-2 rounded-lg font-medium transition">
                    Scan Now
                  </button>
                  <button onClick={() => handleDisconnect("azure")}
                    className={`text-sm px-4 py-2 rounded-lg font-medium transition border ${
                      disconnectConfirm === "azure"
                        ? "bg-red-500 text-white border-red-500"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                    }`}>
                    {disconnectConfirm === "azure" ? "Confirm?" : "Disconnect"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--color-muted)] mb-4">Scan Azure infrastructure for IAM, Defender, Storage, SQL, and key security configurations.</p>
                <a href={`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=10e95a0a-ac49-4a44-9fda-00b0d3b58c24&response_type=code&redirect_uri=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://shieldbase.vercel.app'}/api/auth/azure/callback`)}&scope=Directory.Read.All%20Policy.Read.All%20Reports.Read.All%20SecurityEvents.Read.All%20User.Read%20offline_access&response_mode=query&state=${org?.id}`}
                  className="block w-full text-center bg-[#0078D4] hover:bg-[#006cbd] text-white text-sm py-2.5 rounded-lg font-medium transition">
                  Authorize with Microsoft →
                </a>
              </>
            )}
          </div>

        </div>

        <div className="text-center pt-2">
          <a href="mailto:hello@shieldbase.io?subject=Integration request"
            className="text-sm text-[var(--color-info)] hover:underline font-medium">
            Missing an integration? Let us know →
          </a>
        </div>
      </div>
    );
  }

  if (step === "aws") {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("choose")} className="text-sm text-[var(--color-info)] hover:underline">← Back</button>
          <span className="text-[var(--color-muted)]">|</span>
          <span className="text-sm font-medium text-[var(--color-foreground-subtle)]">Connect Amazon Web Services</span>
        </div>

        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="bg-[var(--color-foreground)] px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-2xl"></div>
            <div>
              <h2 className="text-lg font-bold text-white">Amazon Web Services</h2>
              <p className="text-sm text-[var(--color-muted)]">Read-only access · Takes 2 minutes · No technical knowledge needed</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-[var(--color-info-bg)] border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-[var(--color-info)] font-medium mb-1">How this works</p>
              <p className="text-xs text-[var(--color-info)]">
                We create a <strong>read-only role</strong> in your AWS account that ShieldBase can use to run security scans.
                We can never modify, delete, or create anything — we can only read configuration data.
                Your data never leaves AWS.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">1</div>
                <h3 className="font-semibold text-[var(--color-foreground-subtle)]">Launch the setup in your AWS account</h3>
              </div>
              <p className="text-sm text-[var(--color-muted)] mb-4 ml-10">
                Click the button below. It opens AWS CloudFormation and automatically creates a read-only security role.
                You just need to click <strong>"Create Stack"</strong> in AWS — no configuration needed.
              </p>
              <a href={CFN_TEMPLATE_URL} target="_blank" rel="noopener noreferrer"
                className="ml-10 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition">
                <span></span> Open in AWS Console →
              </a>
              <p className="text-xs text-[var(--color-muted)] ml-10 mt-2">Opens in a new tab · Takes about 60 seconds to create</p>
            </div>

            <hr className="border-[var(--color-border)]" />

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">2</div>
                <h3 className="font-semibold text-[var(--color-foreground-subtle)]">Copy your Role ARN from AWS</h3>
              </div>
              <div className="ml-10 space-y-3">
                <p className="text-sm text-[var(--color-muted)]">
                  Once the stack is created, go to <strong>CloudFormation → Stacks → ShieldBaseReadOnly → Outputs</strong>.
                  Copy the value labeled <strong>"ShieldBaseRoleARN"</strong>.
                </p>
                <div className="bg-[var(--color-surface)] rounded-lg p-3 text-xs text-[var(--color-muted)] font-mono">
                  Example: arn:aws:iam::<strong>YOUR_ACCOUNT_ID</strong>:role/ShieldBaseReadOnly
                </div>
              </div>
            </div>

            <hr className="border-[var(--color-border)]" />

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">3</div>
                <h3 className="font-semibold text-[var(--color-foreground-subtle)]">Paste it here</h3>
              </div>
              <div className="ml-10 space-y-3">
                {arnSaved ? (
                  <div className="bg-[var(--color-success-bg)] border border-[var(--color-success)] rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl"></span>
                    <div>
                      <p className="text-sm font-bold text-green-800">AWS connected successfully!</p>
                      <p className="text-xs text-[var(--color-success)] mt-0.5">We'll run your first scan within the next few minutes and update your dashboard.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <input value={arnInput} onChange={e => setArnInput(e.target.value)}
                      placeholder="arn:aws:iam::123456789012:role/ShieldBaseReadOnly"
                      className="w-full border border-[var(--color-border-strong)] rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
                    <button onClick={saveArn} disabled={!arnInput || saving}
                      className="bg-blue-600 hover:opacity-90 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition">
                      {saving ? "Saving..." : "Connect AWS Account →"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-xl p-4 mt-2">
              <p className="text-xs font-semibold text-[var(--color-muted)] mb-2"> Security & Privacy</p>
              <ul className="text-xs text-[var(--color-muted)] space-y-1">
                <li>• ShieldBase uses <strong>ReadOnlyAccess</strong> and <strong>SecurityAudit</strong> policies only</li>
                <li>• We <strong>never</strong> modify, create, or delete any resources in your account</li>
                <li>• You can revoke access at any time by deleting the CloudFormation stack</li>
                <li>• Scan results are stored in your private Supabase database</li>
                <li>• Our AWS Account ID: <code className="bg-[var(--color-border)] px-1 rounded">{SHIELDBASE_AWS_ACCOUNT_ID}</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "github") {
    const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read%3Aorg%2Cread%3Auser%2Crepo%3Astatus%2Csecurity_events&redirect_uri=https%3A%2F%2Fshieldbase.vercel.app%2Fapi%2Fauth%2Fgithub%2Fcallback&state=${org?.id ?? ""}`;
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("choose")} className="text-sm text-[var(--color-info)] hover:underline">← Back</button>
        </div>
        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="bg-[var(--color-foreground)] px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--color-foreground)] rounded-xl flex items-center justify-center text-2xl"></div>
            <div>
              <h2 className="text-lg font-bold text-white">GitHub</h2>
              <p className="text-sm text-[var(--color-muted)]">Read-only · Authorize in 30 seconds</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-[var(--color-info-bg)] border border-blue-100 rounded-xl p-4 text-sm text-[var(--color-info)]">
              ShieldBase will read your organization's settings, branch protection rules, member access, and security alerts. We never push code or modify settings.
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--color-foreground-subtle)]">What we monitor:</p>
              {["Branch protection rules on all repos", "PR review requirements", "2FA enforcement for all members", "Dependabot security alerts", "Outside collaborator access", "Deploy keys and OAuth apps"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <span className="text-[var(--color-success)]">✓</span> {item}
                </div>
              ))}
            </div>
            <a href={githubOAuthUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[var(--color-foreground)] hover:bg-[var(--color-foreground)] text-white py-3 rounded-xl font-semibold transition">
              <span></span> Authorize ShieldBase on GitHub →
            </a>
            <p className="text-xs text-[var(--color-muted)] text-center">You'll be redirected to GitHub to install our app on your organization</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "google") {
    const googleRedirect = `${SITE_ORIGIN}/api/auth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(googleRedirect)}&response_type=code&scope=${encodeURIComponent(GOOGLE_SCOPES)}&access_type=offline&prompt=consent&state=${org?.id ?? ""}`;
    return (
      <div className="max-w-2xl space-y-6">
        <button onClick={() => setStep("choose")} className="text-sm text-[var(--color-info)] hover:underline">← Back</button>
        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="bg-[var(--color-foreground)] px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl"></div>
            <div>
              <h2 className="text-lg font-bold text-white">Google Workspace</h2>
              <p className="text-sm text-[var(--color-muted)]">Admin read-only · Requires Google Workspace Admin</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-[var(--color-warning-bg)] border border-yellow-100 rounded-xl p-4">
              <p className="text-sm text-[var(--color-warning)] font-medium mb-1"> Requires Super Admin</p>
              <p className="text-xs text-[var(--color-warning)]">A Google Workspace Super Admin must authorize this connection. If that's not you, forward these instructions to your IT admin.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--color-foreground-subtle)]">What we monitor:</p>
              {["User directory and account status", "MFA/2SV enrollment and enforcement", "Admin role assignments", "Password policies", "Login audit events", "External sharing settings"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <span className="text-[var(--color-success)]">✓</span> {item}
                </div>
              ))}
            </div>
            <a href={googleAuthUrl}
              className={`w-full flex items-center justify-center gap-2 bg-blue-600 hover:opacity-90 text-white py-3 rounded-xl font-semibold transition ${!GOOGLE_CLIENT_ID ? "opacity-50 pointer-events-none" : ""}`}>
              <span></span> Authorize with Google →
            </a>
            {!GOOGLE_CLIENT_ID && <p className="text-xs text-[var(--color-danger)] text-center">NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured</p>}
            <p className="text-xs text-[var(--color-muted)] text-center">Redirects to Google OAuth — sign in with your Workspace Admin account</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "slack") {
    const slackRedirect = `${SITE_ORIGIN}/api/auth/slack/callback`;
    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(SLACK_CLIENT_ID)}&scope=${encodeURIComponent(SLACK_SCOPES)}&redirect_uri=${encodeURIComponent(slackRedirect)}&state=${org?.id ?? ""}`;
    return (
      <div className="max-w-2xl space-y-6">
        <button onClick={() => setStep("choose")} className="text-sm text-[var(--color-info)] hover:underline">← Back</button>
        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="bg-[var(--color-foreground)] px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-2xl"></div>
            <div>
              <h2 className="text-lg font-bold text-white">Slack</h2>
              <p className="text-sm text-[var(--color-muted)]">Workspace admin access · Authorize in seconds</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--color-foreground-subtle)]">What we monitor:</p>
              {["Workspace member list and status", "SSO/SAML enforcement", "2FA requirements", "Data retention policies", "External sharing settings", "Approved app installations"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <span className="text-[var(--color-success)]">✓</span> {item}
                </div>
              ))}
            </div>
            <a href={slackAuthUrl}
              className={`w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition ${!SLACK_CLIENT_ID ? "opacity-50 pointer-events-none" : ""}`}>
              <span></span> Add to Slack →
            </a>
            {!SLACK_CLIENT_ID && <p className="text-xs text-[var(--color-danger)] text-center">NEXT_PUBLIC_SLACK_CLIENT_ID not configured</p>}
            <p className="text-xs text-[var(--color-muted)] text-center">Redirects to Slack OAuth — you'll need Workspace Admin or Owner access</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
