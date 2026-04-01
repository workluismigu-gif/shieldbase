"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";

const SHIELDBASE_AWS_ACCOUNT_ID = "886821787192";
const CFN_TEMPLATE_URL = `https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=ShieldBaseReadOnly&templateURL=https://shieldbase.vercel.app/cfn-shieldbase-readonly.json`;

type Step = "choose" | "aws" | "github" | "google" | "slack" | "done";

export default function ConnectPage() {
  const { org } = useOrg();
  const techStack = (org?.tech_stack ?? {}) as Record<string, string>;
  const awsConnected = !!techStack.aws_role_arn;

  const [step, setStep] = useState<Step>("choose");
  const [arnInput, setArnInput] = useState("");
  const [arnSaved, setArnSaved] = useState(awsConnected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const saveArn = async () => {
    if (!arnInput.startsWith("arn:aws:iam::")) {
      setError("Invalid ARN format. Should look like: arn:aws:iam::123456789012:role/ShieldBaseReadOnly");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        await supabase.from("organizations")
          .update({ tech_stack: { aws_role_arn: arnInput } })
          .eq("owner_id", sessionData.session.user.id);
      }
      setArnSaved(true);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (step === "choose") {
    return (
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connect Your Tools</h1>
          <p className="text-sm text-gray-500 mt-1">Connect your cloud accounts and services so ShieldBase can automatically collect compliance evidence. No technical setup required.</p>
        </div>

        {/* Already connected */}
        {awsConnected && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">✅ Connected (1)</h2>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">☁️</span>
                <div>
                  <div className="text-sm font-medium text-gray-800">Amazon Web Services</div>
                  <div className="text-xs text-gray-400 font-mono truncate max-w-xs">{techStack.aws_role_arn}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">● Active</span>
                <button onClick={async () => {
                  await supabase.from("organizations").update({ tech_stack: {} }).eq("id", org!.id);
                  window.location.reload();
                }} className="text-xs text-gray-400 hover:text-red-500 transition">Disconnect</button>
              </div>
            </div>
          </div>
        )}

        {/* Available to connect */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-4">Add Integration</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { id: "aws" as Step, name: "Amazon Web Services", logo: "☁️", desc: "Scan your cloud infrastructure for security gaps", priority: true },
              { id: "github" as Step, name: "GitHub", logo: "🐙", desc: "Monitor branch protection, access, and code reviews", priority: false },
              { id: "google" as Step, name: "Google Workspace", logo: "📧", desc: "Monitor users, MFA enforcement, and admin roles", priority: false },
              { id: "slack" as Step, name: "Slack", logo: "💬", desc: "Monitor workspace settings and data retention", priority: false },
            ].map(int => (
              <button key={int.id} onClick={() => setStep(int.id)}
                className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-sm transition group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-50 transition">{int.logo}</div>
                    <div>
                      <div className="font-semibold text-gray-900">{int.name}</div>
                      {int.priority && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Recommended first</span>}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{int.desc}</p>
                <div className="mt-3 text-sm text-blue-600 font-medium group-hover:text-blue-700">Connect →</div>
              </button>
            ))}
          </div>
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
    const githubOAuthUrl = `https://github.com/apps/shieldbase-compliance/installations/new`;
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

  return null;
}
