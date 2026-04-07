"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";

const SHIELDBASE_AWS_ACCOUNT_ID = "886821787192";
const CFN_TEMPLATE_URL = `https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=ShieldBaseReadOnly&templateURL=https://shieldbase-public-cfn.s3.amazonaws.com/cfn-shieldbase-readonly.json`;
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "Ov23lihUSDcOADRW0Kkw";

type Step = "choose" | "aws" | "github" | "google" | "slack" | "azure" | "done";

export default function ConnectPage() {
  const { org } = useOrg();
  const techStack = (org?.tech_stack ?? {}) as Record<string, string>;
  const awsConnected = !!techStack.aws_role_arn;
  const githubConnected = !!techStack.github_token;
  const azureConnected = !!techStack.azure_subscription_id;

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

      // Call server-side endpoint — saves ARN + triggers scan (secret stays on server)
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
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500 mt-1">Connect your cloud accounts and services so ShieldBase can automatically collect compliance evidence.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">

          {/* AWS */}
          <div className={`bg-white rounded-2xl border p-6 ${awsConnected ? "border-green-200 border-l-4 border-l-green-400" : "border-gray-200"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl">☁️</div>
                <div>
                  <div className="font-semibold text-gray-900">Amazon Web Services</div>
                  <div className="text-xs text-gray-400">Cloud provider</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${awsConnected ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-xs font-medium ${awsConnected ? "text-green-600" : "text-gray-400"}`}>
                  {awsConnected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
            {awsConnected ? (
              <>
                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Account ID</span>
                    <span className="font-mono font-medium text-gray-800">{awsAccountId || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Role</span>
                    <span className="font-mono font-medium text-gray-800 truncate max-w-[160px]">{awsRoleName || "—"}</span>
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
                        : "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600"
                    }`}>
                    {disconnectConfirm === "aws" ? "Confirm?" : "Disconnect"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">Automatically scan your AWS infrastructure for IAM, S3, CloudTrail, RDS, and 100+ SOC 2 checks.</p>
                <button onClick={() => setStep("aws")}
                  className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white text-sm py-2.5 rounded-lg font-medium transition">
                  Connect AWS →
                </button>
              </>
            )}
          </div>

          {/* GitHub */}
          <div className={`bg-white rounded-2xl border p-6 ${githubConnected ? "border-green-200 border-l-4 border-l-green-400" : "border-gray-200"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-2xl">🐙</div>
                <div>
                  <div className="font-semibold text-gray-900">GitHub</div>
                  <div className="text-xs text-gray-400">Source control</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${githubConnected ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-xs font-medium ${githubConnected ? "text-green-600" : "text-gray-400"}`}>
                  {githubConnected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
            {githubConnected ? (
              <>
                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Account</span>
                    <span className="font-medium text-gray-800">@{githubLogin}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleScanNow("github")}
                    className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-sm py-2 rounded-lg font-medium transition">
                    Scan Now
                  </button>
                  <button onClick={() => handleDisconnect("github")}
                    className={`text-sm px-4 py-2 rounded-lg font-medium transition border ${
                      disconnectConfirm === "github"
                        ? "bg-red-500 text-white border-red-500"
                        : "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600"
                    }`}>
                    {disconnectConfirm === "github" ? "Confirm?" : "Disconnect"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">Monitor branch protection, code reviews, 2FA enforcement, Dependabot alerts, and secret scanning across your repos.</p>
                <button onClick={() => setStep("github")}
                  className="block w-full text-center bg-gray-900 hover:bg-gray-700 text-white text-sm py-2.5 rounded-lg font-medium transition">
                  Connect GitHub →
                </button>
              </>
            )}
          </div>

          {/* Google Workspace — Coming Soon */}
          <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6 opacity-60">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl border border-gray-200">📧</div>
                <div>
                  <div className="font-semibold text-gray-600">Google Workspace</div>
                  <div className="text-xs text-gray-400">Identity provider</div>
                </div>
              </div>
              <span className="text-xs bg-purple-100 text-purple-600 px-2.5 py-1 rounded-full font-medium">Coming Soon</span>
            </div>
            <p className="text-sm text-gray-400">Monitor user accounts, MFA enforcement, admin roles, and login activity across your Google Workspace org.</p>
          </div>

          {/* Slack — Coming Soon */}
          <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6 opacity-60">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl border border-gray-200">💬</div>
                <div>
                  <div className="font-semibold text-gray-600">Slack</div>
                  <div className="text-xs text-gray-400">Communication</div>
                </div>
              </div>
              <span className="text-xs bg-purple-100 text-purple-600 px-2.5 py-1 rounded-full font-medium">Coming Soon</span>
            </div>
            <p className="text-sm text-gray-400">Monitor workspace settings, SSO enforcement, data retention policies, and admin roles.</p>
          </div>

          {/* Microsoft Azure */}
          <div className={`bg-white rounded-2xl border p-6 ${azureConnected ? "border-green-200 border-l-4 border-l-green-400" : "border-gray-200"}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#0078D4]/10 rounded-xl flex items-center justify-center text-2xl">🔷</div>
                <div>
                  <div className="font-semibold text-gray-900">Microsoft Azure</div>
                  <div className="text-xs text-gray-400">Cloud provider</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${azureConnected ? "bg-green-500" : "bg-gray-300"}`} />
                <span className={`text-xs font-medium ${azureConnected ? "text-green-600" : "text-gray-400"}`}>
                  {azureConnected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
            {azureConnected ? (
              <>
                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subscription</span>
                    <span className="font-mono font-medium text-gray-800 truncate max-w-[160px]">{techStack.azure_subscription_id || "—"}</span>
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
                        : "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600"
                    }`}>
                    {disconnectConfirm === "azure" ? "Confirm?" : "Disconnect"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">Scan Azure infrastructure for IAM, Defender, Storage, SQL, and key security configurations.</p>
                <button onClick={() => setStep("azure")}
                  className="block w-full text-center bg-[#0078D4] hover:bg-[#006cbd] text-white text-sm py-2.5 rounded-lg font-medium transition">
                  Connect Azure →
                </button>
              </>
            )}
          </div>

        </div>

        <div className="text-center pt-2">
          <a href="mailto:hello@shieldbase.io?subject=Integration request"
            className="text-sm text-blue-600 hover:underline font-medium">
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
          <button onClick={() => setStep("choose")} className="text-sm text-blue-600 hover:underline">← Back</button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">Connect Amazon Web Services</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-2xl">☁️</div>
            <div>
              <h2 className="text-lg font-bold text-white">Amazon Web Services</h2>
              <p className="text-sm text-gray-400">Read-only access · Takes 2 minutes · No technical knowledge needed</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* How it works */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-blue-800 font-medium mb-1">How this works</p>
              <p className="text-xs text-blue-700">
                We create a <strong>read-only role</strong> in your AWS account that ShieldBase can use to run security scans.
                We can never modify, delete, or create anything — we can only read configuration data.
                Your data never leaves AWS.
              </p>
            </div>

            {/* Step 1 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">1</div>
                <h3 className="font-semibold text-gray-800">Launch the setup in your AWS account</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4 ml-10">
                Click the button below. It opens AWS CloudFormation and automatically creates a read-only security role.
                You just need to click <strong>"Create Stack"</strong> in AWS — no configuration needed.
              </p>
              <a href={CFN_TEMPLATE_URL} target="_blank" rel="noopener noreferrer"
                className="ml-10 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition">
                <span>☁️</span> Open in AWS Console →
              </a>
              <p className="text-xs text-gray-400 ml-10 mt-2">Opens in a new tab · Takes about 60 seconds to create</p>
            </div>

            <hr className="border-gray-100" />

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">2</div>
                <h3 className="font-semibold text-gray-800">Copy your Role ARN from AWS</h3>
              </div>
              <div className="ml-10 space-y-3">
                <p className="text-sm text-gray-500">
                  Once the stack is created, go to <strong>CloudFormation → Stacks → ShieldBaseReadOnly → Outputs</strong>.
                  Copy the value labeled <strong>"ShieldBaseRoleARN"</strong>.
                </p>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 font-mono">
                  Example: arn:aws:iam::<strong>YOUR_ACCOUNT_ID</strong>:role/ShieldBaseReadOnly
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Step 3 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">3</div>
                <h3 className="font-semibold text-gray-800">Paste it here</h3>
              </div>
              <div className="ml-10 space-y-3">
                {arnSaved ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl">🎉</span>
                    <div>
                      <p className="text-sm font-bold text-green-800">AWS connected successfully!</p>
                      <p className="text-xs text-green-600 mt-0.5">We'll run your first scan within the next few minutes and update your dashboard.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <input value={arnInput} onChange={e => setArnInput(e.target.value)}
                      placeholder="arn:aws:iam::123456789012:role/ShieldBaseReadOnly"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <button onClick={saveArn} disabled={!arnInput || saving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition">
                      {saving ? "Saving..." : "Connect AWS Account →"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Trust section */}
            <div className="bg-gray-50 rounded-xl p-4 mt-2">
              <p className="text-xs font-semibold text-gray-600 mb-2">🔒 Security & Privacy</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• ShieldBase uses <strong>ReadOnlyAccess</strong> and <strong>SecurityAudit</strong> policies only</li>
                <li>• We <strong>never</strong> modify, create, or delete any resources in your account</li>
                <li>• You can revoke access at any time by deleting the CloudFormation stack</li>
                <li>• Scan results are stored in your private Supabase database</li>
                <li>• Our AWS Account ID: <code className="bg-gray-200 px-1 rounded">{SHIELDBASE_AWS_ACCOUNT_ID}</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GitHub OAuth flow
  if (step === "github") {
    const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read%3Aorg%2Cread%3Auser%2Crepo%3Astatus%2Csecurity_events&redirect_uri=https%3A%2F%2Fshieldbase.vercel.app%2Fapi%2Fauth%2Fgithub%2Fcallback&state=${org?.id ?? ""}`;
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("choose")} className="text-sm text-blue-600 hover:underline">← Back</button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-900 px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-2xl">🐙</div>
            <div>
              <h2 className="text-lg font-bold text-white">GitHub</h2>
              <p className="text-sm text-gray-400">Read-only · Authorize in 30 seconds</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
              ShieldBase will read your organization's settings, branch protection rules, member access, and security alerts. We never push code or modify settings.
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">What we monitor:</p>
              {["Branch protection rules on all repos", "PR review requirements", "2FA enforcement for all members", "Dependabot security alerts", "Outside collaborator access", "Deploy keys and OAuth apps"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {item}
                </div>
              ))}
            </div>
            <a href={githubOAuthUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-semibold transition">
              <span>🐙</span> Authorize ShieldBase on GitHub →
            </a>
            <p className="text-xs text-gray-400 text-center">You'll be redirected to GitHub to install our app on your organization</p>
          </div>
        </div>
      </div>
    );
  }

  // Google Workspace
  if (step === "google") {
    return (
      <div className="max-w-2xl space-y-6">
        <button onClick={() => setStep("choose")} className="text-sm text-blue-600 hover:underline">← Back</button>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-900 px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl">📧</div>
            <div>
              <h2 className="text-lg font-bold text-white">Google Workspace</h2>
              <p className="text-sm text-gray-400">Admin read-only · Requires Google Workspace Admin</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Requires Super Admin</p>
              <p className="text-xs text-yellow-700">A Google Workspace Super Admin must authorize this connection. If that's not you, forward these instructions to your IT admin.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">What we monitor:</p>
              {["User directory and account status", "MFA/2SV enrollment and enforcement", "Admin role assignments", "Password policies", "Login audit events", "External sharing settings"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {item}
                </div>
              ))}
            </div>
            <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition">
              <span>📧</span> Authorize with Google →
            </button>
            <p className="text-xs text-gray-400 text-center">Redirects to Google OAuth — sign in with your Workspace Admin account</p>
          </div>
        </div>
      </div>
    );
  }

  // Slack
  if (step === "slack") {
    return (
      <div className="max-w-2xl space-y-6">
        <button onClick={() => setStep("choose")} className="text-sm text-blue-600 hover:underline">← Back</button>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-900 px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-2xl">💬</div>
            <div>
              <h2 className="text-lg font-bold text-white">Slack</h2>
              <p className="text-sm text-gray-400">Workspace admin access · Authorize in seconds</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">What we monitor:</p>
              {["Workspace member list and status", "SSO/SAML enforcement", "2FA requirements", "Data retention policies", "External sharing settings", "Approved app installations"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {item}
                </div>
              ))}
            </div>
            <button className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition">
              <span>💬</span> Add to Slack →
            </button>
            <p className="text-xs text-gray-400 text-center">Redirects to Slack OAuth — you'll need Workspace Admin or Owner access</p>
          </div>
        </div>
      </div>
    );
  }

  // Azure
  if (step === "azure") {
    const [subId, setSubId] = useState("");
    const [tenantId, setTenantId] = useState("");
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [azureSaving, setAzureSaving] = useState(false);
    const [azureError, setAzureError] = useState("");

    const handleAzureConnect = async () => {
      if (!subId || !tenantId || !clientId || !clientSecret) {
        setAzureError("All fields are required");
        return;
      }
      setAzureSaving(true);
      setAzureError("");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) throw new Error("Not logged in");

        const tech = { ...techStack, azure_subscription_id: subId, azure_tenant_id: tenantId, azure_client_id: clientId, azure_client_secret: clientSecret, azure_connected_at: new Date().toISOString() };
        const { error } = await supabase.from("organizations").update({ tech_stack: tech }).eq("id", org!.id);
        if (error) throw error;

        // Trigger scan
        fetch("/api/scan/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.INTERNAL_TRIGGER_SECRET || "shieldbase-internal-2026"}` },
          body: JSON.stringify({ org_id: org!.id, provider: "azure" }),
        }).catch(console.error);

        setStep("choose");
      } catch (err: unknown) {
        setAzureError(err instanceof Error ? err.message : "Failed to connect");
      } finally {
        setAzureSaving(false);
      }
    };

    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("choose")} className="text-sm text-blue-600 hover:underline">← Back</button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">Connect Microsoft Azure</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-[#0078D4] px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">🔷</div>
            <div>
              <h2 className="text-lg font-bold text-white">Microsoft Azure</h2>
              <p className="text-sm text-blue-100">Read-only access · Requires Service Principal</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-blue-800 font-medium mb-1">How this works</p>
              <p className="text-xs text-blue-700">
                We use a <strong>Service Principal</strong> with Reader and Security Reader roles to scan your Azure subscription.
                Prowler checks for compliance with SOC 2, CIS, and other frameworks.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">Required Information:</p>
              <div className="grid gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subscription ID</label>
                  <input type="text" value={subId} onChange={(e) => setSubId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tenant ID</label>
                  <input type="text" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client ID (App ID)</label>
                  <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client Secret</label>
                  <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="••••••••••••••••" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {azureError && <p className="text-sm text-red-500">{azureError}</p>}
              <button onClick={handleAzureConnect} disabled={azureSaving} className="w-full bg-[#0078D4] hover:bg-[#006cbd] disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition">
                {azureSaving ? "Connecting..." : "Connect Azure →"}
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mt-2">
              <p className="text-xs font-semibold text-gray-600 mb-2">🔒 Security & Privacy</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• ShieldBase uses <strong>Reader</strong> and <strong>Security Reader</strong> roles only</li>
                <li>• We <strong>never</strong> modify, create, or delete any resources in your subscription</li>
                <li>• Scan results are stored in your private Supabase database</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
