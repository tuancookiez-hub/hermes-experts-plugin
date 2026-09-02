/**
 * Experts — Hermes Desktop plugin. GENERATED FILE — do not edit here.
 *
 *   source of truth : src/registry.json           (team metadata, NO contracts)
 *                     teams/<team>.json            (heavy payloads, fetched on demand)
 *   generator       : src/build-shell.mjs          (injects the registry into this file)
 *
 * Install to:  <hermes home>/desktop-plugins/experts/plugin.js
 * The resolver is PROFILE-AWARE (apps/desktop/electron/fs-ipc.ts:81-97):
 *   profile 'default'/unset  -> <hermesHome>/desktop-plugins
 *   named profile            -> <hermesHome>/profiles/<name>/desktop-plugins
 * The folder name MUST equal the plugin id: "experts".
 *
 * WHY ONE FILE
 *
 *   The runtime evaluates plugins as a blob URL after rewriting only the
 *   three mapped specifiers (apps/desktop/src/contrib/runtime-loader.ts), so
 *   a relative `import './catalog.js'` would never resolve. The split is
 *   therefore at the SOURCE level: markdown + JSON in, one self-contained
 *   module out.
 *
 * WHAT THE CATALOG IS
 *
 *   A download-on-demand expert catalog. The plugin bundles only a lightweight
 *   REGISTRY (team names, roles, tags, rosters) so the whole catalog is
 *   browseable offline. Each team's full contract prose lives in
 *   teams/<team>.json on GitHub and is fetched + cached in localStorage the
 *   first time you Install or Summon that team.
 *
 *   Content is adapted from msitarzewski/agency-agents (MIT) with attribution —
 *   see NOTICE-agency-agents.md in the repo. The public catalog deliberately
 *   excludes the WorkBuddy-derived teams that exist only in the local build.
 *
 *   A team here is a DOMAIN (e.g. marketing): one synthetic lead that
 *   orchestrates the domain's specialists, plus those specialists as members.
 *   Installing a team caches every contract; summoning any expert auto-installs
 *   its team on the fly.
 *
 * HOW A RUN WORKS (one session per expert / team lead)
 *
 *   Clicking anything here spawns a real Hermes session. Nothing is injected
 *   into the user's current session, and no profile is created or swapped:
 *
 *     1. session.create   seeded with {role:'system', content: <persona>}
 *     2. prompt.submit    the task, into that session
 *     3. host.openSession navigate the UI to it
 *
 *   So the expert is a session the user can watch, interrupt, and continue.
 *   It inherits the active profile and the focused session's cwd.
 *
 *   For a TEAM, the session is seeded with the team lead's persona. The lead
 *   then delegates to its members with Hermes's own `delegate_task`
 *   (tools/delegate_tool.py). That is the whole orchestration:
 *
 *     - a child gets a FRESH conversation and inherits the parent's toolsets
 *       (so topic-researcher can actually search),
 *     - the parent sees only the call and the child's summary result,
 *     - children cannot delegate further, so the shape stays flat:
 *       lead -> member, never member -> member.
 *
 *   The one translation that mattered: WorkBuddy passes a member's persona
 *   implicitly via subagent_type. Hermes children get an empty context, so the
 *   lead is instructed to paste each member's contract into `context` on every
 *   delegation. That is why the member contracts are inlined in the lead's
 *   system prompt under MEMBER CONTRACTS.
 *
 * VISIBILITY
 *
 *   The page renders in the workspace pane like any built-in view — the same
 *   surface turbofit uses — at height:100% with a minHeight floor.
 *
 *   History, because it explains the minHeight: an earlier build painted this
 *   as fixed, full-window, z-index chrome. That was a workaround for a page
 *   that rendered blank, and the diagnosis behind it was wrong. Two things
 *   were true: contributed pages do mount in a display:contents wrapper that
 *   generates no box, but that does NOT stop height:100% from resolving — it
 *   resolves against the pane instead, which is exactly what turbofit relies
 *   on. The actual blank page was a bare Node builtin specifier in the plugin
 *   (the fs module), which runtime-loader rejects before the module is even
 *   evaluated — the plugin never executed at all. The overlay hid the symptom
 *   and cost the pane. The minHeight stays only as a floor against a collapse,
 *   not as the layout strategy.
 *
 *   Diagnostics: statusbar chip (loaded) -> palette "Experts: Ping" (toast,
 *   no rendering) -> palette "Open Experts" (the page).
 *
 * Plain ESM, loaded uncompiled: jsx() calls, not JSX syntax.
 * Only these imports resolve: @hermes/plugin-sdk, react, react/jsx-runtime.
 *
 * NEVER write the offending specifier literally in this file — not even in a
 * comment. runtime-loader.ts:57 scans the whole SOURCE (comments and string
 * literals included) with /(from\s*|import\s*\(\s*|import\s+)(['"])([^'"]+)\2/g
 * and rejects the plugin before evaluation if it finds a bare specifier that
 * is not in the SDK map. A comment documenting that bug WILL reintroduce it.
 * build.mjs enforces this — see assertNoBareSpecifiers().
 */

import {
  PALETTE_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  STATUSBAR_AREAS,
  haptic,
  host,
} from '@hermes/plugin-sdk'
import { Component, useState, useEffect } from 'react'
import { jsx } from 'react/jsx-runtime'

const ID = 'experts'
const PAGE = '/experts'

const TABS = [
  { id: 'experts', label: 'Experts' },
  { id: 'teams', label: 'Expert Teams' },
]

const ACCENT = '#6366f1'

/**
 * Used when the user clicks an expert without typing a task. Summoning a
 * specialist who immediately starts guessing is worse than one who asks.
 */
const INTRO_TASK =
  'Introduce yourself in two sentences: who you are and what you are for. ' +
  'Then state exactly what you need from the user to begin, and ask for it. ' +
  'Do not start the work until they answer.'

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG — injected by build.mjs from teams.json + catalog/*.md
// ═══════════════════════════════════════════════════════════════════════════

const DATA = {
  "build": "2026-09-02.1-shell",
  "source": {
    "updated": "2026-09-02",
    "note": "agency-agents (MIT) catalog — download-on-demand"
  },
  "soloTail": "You are working directly with the user on a single task, not being\ncoordinated by a team lead, so:\n- Do the work described above and hand the result to the user.\n- If the task needs something outside your specialism, say so plainly\n  rather than attempting it badly.\n- If you cannot meet the standard above (for example, not enough sources),\n  say so explicitly instead of quietly lowering it.\n\n## Tool reality in this environment (Hermes)\n\nThis expert runs inside **Hermes Desktop**. Its toolset is smaller and more\ngeneric than the Claude-Code environment many persona sources assume. Read this\nbefore promising anything. Where a contract above names a Claude-Code tool,\nuse the Hermes equivalent in the table.\n\n### Available — use these\n\n| Need | Hermes tool | Notes |\n|------|------------|-------|\n| Search the web | web search toolset | real and usable |\n| Fetch a URL | web fetch toolset | real and usable |\n| Read a file | file Read toolset | use absolute paths |\n| Write a file | file Write toolset | use absolute paths |\n| Edit a file | file Edit toolset | use absolute paths |\n| Run a command / script | terminal toolset | bash, and ffmpeg / ffprobe / whisper |\n| Generate an image | image_generate (toolset image_gen) | gated on a configured provider |\n| Generate a video | video_generate (toolset video_gen) | gated on a configured provider |\n| Inspect an image | vision_analyze (toolset vision) | **images only — not video** |\n| Delegate a subtask | spawn a sub-session | no literal Task tool; break work into steps or a child session |\n\n### Not available — do not reference, do not promise\n\n- **Publishing APIs:** Douyin / Xiaohongshu / Kuaishou / Bilibili / WeChat /\n  TikTok / YouTube / Meta / Threads. Restate as a manual step the user performs;\n  deliver the asset plus a publish checklist, never \"published\".\n- **WorkBuddy / Tencent model IDs** (`hy-video-1.5`, `yt-video-2.0`,\n  `yt-video-humanactor`, `yt-video-fx`, `hy-image-v3.0`, `hy-image-lite`,\n  `youtu-vita`, `ImageGen`, `ImageEdit`) — these names do not exist here. Use\n  image_generate / video_generate instead.\n- **Voice cloning and lip sync** — do not exist.\n- **Cloud editing systems** (Track / EditParam) and **3D generation** — do not exist.\n- **MCP skills and other cloud-only integrations** — check before assuming.\n\n### Rule\n\nCheck a tool's availability before relying on it. If it is unavailable, deliver\nthe spec and a checklist and say that is what it is — never claim an asset was\nproduced when it was not.",
  "github": {
    "owner": "tuancookiez-hub",
    "repo": "hermes-experts-plugin",
    "ref": "main",
    "payloadDir": "teams"
  },
  "base": "https://raw.githubusercontent.com/tuancookiez-hub/hermes-experts-plugin/main/teams/",
  "registry": [
    {
      "id": "marketing",
      "name": "Marketing",
      "avatar": {
        "letter": "M",
        "tone": "sky"
      },
      "memberTone": "sky",
      "remit": "Browse and run 36 Marketing experts. Install the team to cache every contract locally, or summon any single expert on the fly.",
      "startNote": "Brief me on the marketing outcome you want and the channel.",
      "ported": true,
      "lead": {
        "id": "marketing-lead",
        "name": "Marketing Lead",
        "role": "Domain Orchestrator",
        "remit": "Orchestrates 36 Marketing specialists and assembles their work.",
        "tags": [
          "Marketing"
        ]
      },
      "leadSkills": [],
      "skills": [],
      "members": [
        {
          "id": "aa-marketing-aeo-foundations",
          "name": "AEO Foundations Architect",
          "role": "AEO Foundations Architect",
          "remit": "Expert in AI Engine Optimization infrastructure — implements llms.txt, AI-aware robots.txt, token-budgeted content, structured Markdown availability, and agent discovery files so AI crawlers, citation engines, and browsing agents can find, parse, and act on your site",
          "owns": "The foundation layer everyone skips — making sure AI systems can actually discover, read, and use your content before you worry about rankings, citations, or task completion",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the AEO Foundations Architect role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert in AI Engine Optimization infrastructure — implements llms.txt, AI-aware robots.txt, token-budgeted content, structured Markdown availability, and agent discovery files so AI crawlers, citation engines, and browsing agents can find, parse, and act on your site"
            }
          ]
        },
        {
          "id": "aa-marketing-agentic-search-optimizer",
          "name": "Agentic Search Optimizer",
          "role": "Agentic Search Optimizer",
          "remit": "Expert in WebMCP readiness and agentic task completion — audits whether AI agents can actually accomplish tasks on your site (book, buy, register, subscribe), implements WebMCP declarative and imperative patterns, and measures task completion rates across AI browsing agents",
          "owns": "While everyone else is optimizing to get cited by AI, this agent makes sure AI can actually do the thing on your site",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Agentic Search Optimizer role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert in WebMCP readiness and agentic task completion — audits whether AI agents can actually accomplish tasks on your site (book, buy, register, subscribe), implements WebMCP declarative and imperative patterns, and measures task completion rates across AI browsing agents"
            }
          ]
        },
        {
          "id": "aa-marketing-ai-citation-strategist",
          "name": "AI Citation Strategist",
          "role": "AI Citation Strategist",
          "remit": "Expert in AI recommendation engine optimization (AEO/GEO) — audits brand visibility across ChatGPT, Claude, Gemini, and Perplexity, identifies why competitors get cited instead, and delivers content fixes that improve AI citations",
          "owns": "Figures out why the AI recommends your competitor and rewires the signals so it recommends you instead",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the AI Citation Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert in AI recommendation engine optimization (AEO/GEO) — audits brand visibility across ChatGPT, Claude, Gemini, and Perplexity, identifies why competitors get cited instead, and delivers content fixes that improve AI citations"
            }
          ]
        },
        {
          "id": "aa-marketing-app-store-optimizer",
          "name": "App Store Optimizer",
          "role": "App Store Optimizer",
          "remit": "Expert app store marketing specialist focused on App Store Optimization (ASO), conversion rate optimization, and app discoverability",
          "owns": "Gets your app found, downloaded, and loved in the store.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the App Store Optimizer role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert app store marketing specialist focused on App Store Optimization (ASO), conversion rate optimization, and app discoverability"
            }
          ]
        },
        {
          "id": "aa-marketing-baidu-seo-specialist",
          "name": "Baidu SEO Specialist",
          "role": "Baidu SEO Specialist",
          "remit": "Expert Baidu search optimization specialist focused on Chinese search engine ranking, Baidu ecosystem integration, ICP compliance, Chinese keyword research, and mobile-first indexing for the China market.",
          "owns": "Masters Baidu's algorithm so your brand ranks in China's search ecosystem.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Baidu SEO Specialist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert Baidu search optimization specialist focused on Chinese search engine ranking, Baidu ecosystem integration, ICP compliance, Chinese keyword research, and mobile-first indexing for the China market."
            }
          ]
        },
        {
          "id": "aa-marketing-bilibili-content-strategist",
          "name": "Bilibili Content Strategist",
          "role": "Bilibili Content Strategist",
          "remit": "Expert Bilibili marketing specialist focused on UP主 growth, danmaku culture mastery, B站 algorithm optimization, community building, and branded content strategy for China's leading video community platform.",
          "owns": "Speaks fluent danmaku and grows your brand on B站.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Bilibili Content Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert Bilibili marketing specialist focused on UP主 growth, danmaku culture mastery, B站 algorithm optimization, community building, and branded content strategy for China's leading video community platform."
            }
          ]
        },
        {
          "id": "aa-marketing-book-co-author",
          "name": "Book Co-Author",
          "role": "Book Co-Author",
          "remit": "Strategic thought-leadership book collaborator for founders, experts, and operators turning voice notes, fragments, and positioning into structured first-person chapters.",
          "owns": "Turns rough expertise into a recognizable book people can quote, remember, and buy into.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Book Co-Author role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Strategic thought-leadership book collaborator for founders, experts, and operators turning voice notes, fragments, and positioning into structured first-person chapters."
            }
          ]
        },
        {
          "id": "aa-marketing-carousel-growth-engine",
          "name": "Carousel Growth Engine",
          "role": "Carousel Growth Engine",
          "remit": "Autonomous TikTok and Instagram carousel generation specialist.",
          "owns": "Autonomously generates viral carousels from any URL and publishes them to feed.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Carousel Growth Engine role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Autonomous TikTok and Instagram carousel generation specialist. Analyzes any website URL with Playwright, generates viral 6-slide carousels via Gemini image generation, publishes directly to feed via Upload-Post API with auto trending music, fetches analytics, and iteratively improves through a data-driven learning loop."
            }
          ]
        },
        {
          "id": "aa-marketing-china-ecommerce-operator",
          "name": "China E-Commerce Operator",
          "role": "China E-Commerce Operator",
          "remit": "Expert China e-commerce operations specialist covering Taobao, Tmall, Pinduoduo, and JD ecosystems with deep expertise in product listing optimization, live commerce, store operations, 618/Double 11 campaigns, and cross-platform strategy.",
          "owns": "Runs your Taobao, Tmall, Pinduoduo, and JD storefronts like a native operator.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the China E-Commerce Operator role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert China e-commerce operations specialist covering Taobao, Tmall, Pinduoduo, and JD ecosystems with deep expertise in product listing optimization, live commerce, store operations, 618/Double 11 campaigns, and cross-platform strategy."
            }
          ]
        },
        {
          "id": "aa-marketing-china-market-localization-strategist",
          "name": "China Market Localization Strategist",
          "role": "China Market Localization Strategist",
          "remit": "Full-stack China market localization expert who transforms real-time trend signals into executable go-to-market strategies across Douyin, Xiaohongshu, WeChat, Bilibili, and beyond",
          "owns": "Turns China's chaotic trend landscape into a precision-guided marketing machine — data in, revenue out.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the China Market Localization Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Full-stack China market localization expert who transforms real-time trend signals into executable go-to-market strategies across Douyin, Xiaohongshu, WeChat, Bilibili, and beyond"
            }
          ]
        },
        {
          "id": "aa-marketing-content-creator",
          "name": "Content Creator",
          "role": "Content Creator",
          "remit": "Expert content strategist and creator for multi-platform campaigns.",
          "owns": "Crafts compelling stories across every platform your audience lives on.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Content Creator role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert content strategist and creator for multi-platform campaigns. Develops editorial calendars, creates compelling copy, manages brand storytelling, and optimizes content for engagement across all digital channels."
            }
          ]
        },
        {
          "id": "aa-marketing-cross-border-ecommerce",
          "name": "Cross-Border E-Commerce Specialist",
          "role": "Cross-Border E-Commerce Specialist",
          "remit": "Full-funnel cross-border e-commerce strategist covering Amazon, Shopee, Lazada, AliExpress, Temu, and TikTok Shop operations, international logistics and overseas warehousing, compliance and taxation, multilingual listing optimization, brand globalization, and DTC independent site development.",
          "owns": "Takes your products from Chinese factories to global bestseller lists.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Cross-Border E-Commerce Specialist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Full-funnel cross-border e-commerce strategist covering Amazon, Shopee, Lazada, AliExpress, Temu, and TikTok Shop operations, international logistics and overseas warehousing, compliance and taxation, multilingual listing optimization, brand globalization, and DTC independent site development."
            }
          ]
        },
        {
          "id": "aa-marketing-douyin-strategist",
          "name": "Douyin Strategist",
          "role": "Douyin Strategist",
          "remit": "Short-video marketing expert specializing in the Douyin platform, with deep expertise in recommendation algorithm mechanics, viral video planning, livestream commerce workflows, and full-funnel brand growth through content matrix strategies.",
          "owns": "Masters the Douyin algorithm so your short videos actually get seen.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Douyin Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Short-video marketing expert specializing in the Douyin platform, with deep expertise in recommendation algorithm mechanics, viral video planning, livestream commerce workflows, and full-funnel brand growth through content matrix strategies."
            }
          ]
        },
        {
          "id": "aa-marketing-email-strategist",
          "name": "Email Marketing Strategist",
          "role": "Email Marketing Strategist",
          "remit": "Expert email marketing strategist for CRM-driven campaigns, lifecycle automation, segmentation architecture, and deliverability.",
          "owns": "Turns a messy contact list into a segmented, automated revenue engine that sends the right message at the right time.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Email Marketing Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert email marketing strategist for CRM-driven campaigns, lifecycle automation, segmentation architecture, and deliverability. Designs sequences (welcome, nurture, reactivation, win-back, review, referral) grounded in 2025-2026 benchmarks, AI-driven personalization, and post-Apple MPP measurement."
            }
          ]
        },
        {
          "id": "aa-marketing-global-podcast-strategist",
          "name": "Global Podcast Strategist",
          "role": "Global Podcast Strategist",
          "remit": "Expert podcast growth specialist focused on show positioning, audience development, content strategy, and monetisation.",
          "owns": "Turns conversations into communities and episodes into growth engines.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Global Podcast Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert podcast growth specialist focused on show positioning, audience development, content strategy, and monetisation. Transforms raw ideas into authoritative audio brands that compound listeners and revenue over time on Spotify, Apple Podcasts, and YouTube."
            }
          ]
        },
        {
          "id": "aa-marketing-growth-hacker",
          "name": "Growth Hacker",
          "role": "Growth Hacker",
          "remit": "Expert growth strategist specializing in rapid user acquisition through data-driven experimentation.",
          "owns": "Finds the growth channel nobody's exploited yet — then scales it.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Growth Hacker role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert growth strategist specializing in rapid user acquisition through data-driven experimentation. Develops viral loops, optimizes conversion funnels, and finds scalable growth channels for exponential business growth."
            }
          ]
        },
        {
          "id": "aa-marketing-instagram-curator",
          "name": "Instagram Curator",
          "role": "Instagram Curator",
          "remit": "Expert Instagram marketing specialist focused on visual storytelling, community building, and multi-format content optimization.",
          "owns": "Masters the grid aesthetic and turns scrollers into an engaged community.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Instagram Curator role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert Instagram marketing specialist focused on visual storytelling, community building, and multi-format content optimization. Masters aesthetic development and drives meaningful engagement."
            }
          ]
        },
        {
          "id": "aa-marketing-kuaishou-strategist",
          "name": "Kuaishou Strategist",
          "role": "Kuaishou Strategist",
          "remit": "Expert Kuaishou marketing strategist specializing in short-video content for China's lower-tier city markets, live commerce operations, community trust building, and grassroots audience growth on 快手.",
          "owns": "Grows grassroots audiences and drives live commerce on 快手.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Kuaishou Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert Kuaishou marketing strategist specializing in short-video content for China's lower-tier city markets, live commerce operations, community trust building, and grassroots audience growth on 快手."
            }
          ]
        },
        {
          "id": "aa-marketing-linkedin-content-creator",
          "name": "LinkedIn Content Creator",
          "role": "LinkedIn Content Creator",
          "remit": "Expert LinkedIn content strategist focused on thought leadership, personal brand building, and high-engagement professional content.",
          "owns": "Turns professional expertise into scroll-stopping content that makes the right people find you.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the LinkedIn Content Creator role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert LinkedIn content strategist focused on thought leadership, personal brand building, and high-engagement professional content. Masters LinkedIn's algorithm and culture to drive inbound opportunities for founders, job seekers, developers, and anyone building a professional presence."
            }
          ]
        },
        {
          "id": "aa-marketing-livestream-commerce-coach",
          "name": "Livestream Commerce Coach",
          "role": "Livestream Commerce Coach",
          "remit": "Veteran livestream e-commerce coach specializing in host training and live room operations across Douyin, Kuaishou, Taobao Live, and Channels, covering script design, product sequencing, paid-vs-organic traffic balancing, conversion closing techniques, and real-time data-driven optimization.",
          "owns": "Coaches your livestream hosts from awkward beginners to million-yuan sellers.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Livestream Commerce Coach role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Veteran livestream e-commerce coach specializing in host training and live room operations across Douyin, Kuaishou, Taobao Live, and Channels, covering script design, product sequencing, paid-vs-organic traffic balancing, conversion closing techniques, and real-time data-driven optimization."
            }
          ]
        },
        {
          "id": "aa-marketing-multi-platform-publisher",
          "name": "Multi-Platform Publisher",
          "role": "Multi-Platform Publisher",
          "remit": "Expert orchestrator for one-click Chinese blog publishing.",
          "owns": "One article, all platforms, safely — the traffic conductor for Chinese content creators.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Multi-Platform Publisher role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert orchestrator for one-click Chinese blog publishing. Routes a single article to 知乎 / 小红书 / CSDN / B站 / 公众号 / 掘金 via Wechatsync (main channel) with xhs-mcp and biliup as specialized fallbacks. Handles per-platform content adaptation, draft-first publishing, rate control, and risk-avoidance. Does NOT auto-publish — always stops at draft for human review."
            }
          ]
        },
        {
          "id": "aa-marketing-podcast-strategist",
          "name": "Podcast Strategist",
          "role": "Podcast Strategist",
          "remit": "Content strategy and operations expert for the Chinese podcast market, with deep expertise in Xiaoyuzhou, Ximalaya, and other major audio platforms, covering show positioning, audio production, audience growth, multi-platform distribution, and monetization to help podcast creators build sticky audio content brands.",
          "owns": "Guides your podcast from concept to loyal audience in China's booming audio scene.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Podcast Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Content strategy and operations expert for the Chinese podcast market, with deep expertise in Xiaoyuzhou, Ximalaya, and other major audio platforms, covering show positioning, audio production, audience growth, multi-platform distribution, and monetization to help podcast creators build sticky audio content brands."
            }
          ]
        },
        {
          "id": "aa-marketing-pr-communications-manager",
          "name": "PR & Communications Manager",
          "role": "PR & Communications Manager",
          "remit": "Strategic public relations and communications specialist for media relations, press releases, crisis communications, executive thought leadership, brand reputation management, and integrated communications planning — building and protecting reputations through earned media, storytelling, and proactive narrative control",
          "owns": "Reputation is built in years and lost in minutes. Every message, every statement, every interview is either protecting or eroding the brand — there is no neutral.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the PR & Communications Manager role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Strategic public relations and communications specialist for media relations, press releases, crisis communications, executive thought leadership, brand reputation management, and integrated communications planning — building and protecting reputations through earned media, storytelling, and proactive narrative control"
            }
          ]
        },
        {
          "id": "aa-marketing-private-domain-operator",
          "name": "Private Domain Operator",
          "role": "Private Domain Operator",
          "remit": "Expert in building enterprise WeChat (WeCom) private domain ecosystems, with deep expertise in SCRM systems, segmented community operations, Mini Program commerce integration, user lifecycle management, and full-funnel conversion optimization.",
          "owns": "Builds your WeChat private traffic empire from first contact to lifetime value.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Private Domain Operator role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert in building enterprise WeChat (WeCom) private domain ecosystems, with deep expertise in SCRM systems, segmented community operations, Mini Program commerce integration, user lifecycle management, and full-funnel conversion optimization."
            }
          ]
        },
        {
          "id": "aa-marketing-reddit-community-builder",
          "name": "Reddit Community Builder",
          "role": "Reddit Community Builder",
          "remit": "Expert Reddit marketing specialist focused on authentic community engagement, value-driven content creation, and long-term relationship building.",
          "owns": "Speaks fluent Reddit and builds community trust the authentic way.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Reddit Community Builder role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert Reddit marketing specialist focused on authentic community engagement, value-driven content creation, and long-term relationship building. Masters Reddit culture navigation."
            }
          ]
        },
        {
          "id": "aa-marketing-seo-specialist",
          "name": "SEO Specialist",
          "role": "SEO Specialist",
          "remit": "Expert search engine optimization strategist specializing in technical SEO, content optimization, link authority building, and organic search growth.",
          "owns": "Drives sustainable organic traffic through technical SEO and content strategy.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the SEO Specialist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert search engine optimization strategist specializing in technical SEO, content optimization, link authority building, and organic search growth. Drives sustainable traffic through data-driven search strategies."
            }
          ]
        },
        {
          "id": "aa-marketing-short-video-editing-coach",
          "name": "Short-Video Editing Coach",
          "role": "Short-Video Editing Coach",
          "remit": "Hands-on short-video editing coach covering the full post-production pipeline, with mastery of CapCut Pro, Premiere Pro, DaVinci Resolve, and Final Cut Pro across composition and camera language, color grading, audio engineering, motion graphics and VFX, subtitle design, multi-platform export optimization, editing workflow efficiency, and AI-assisted editing.",
          "owns": "Turns raw footage into scroll-stopping short videos with professional polish.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Short-Video Editing Coach role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Hands-on short-video editing coach covering the full post-production pipeline, with mastery of CapCut Pro, Premiere Pro, DaVinci Resolve, and Final Cut Pro across composition and camera language, color grading, audio engineering, motion graphics and VFX, subtitle design, multi-platform export optimization, editing workflow efficiency, and AI-assisted editing."
            }
          ]
        },
        {
          "id": "aa-marketing-social-media-strategist",
          "name": "Social Media Strategist",
          "role": "Social Media Strategist",
          "remit": "Expert social media strategist for LinkedIn, Twitter, and professional platforms.",
          "owns": "Orchestrates cross-platform campaigns that build community and drive engagement.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Social Media Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert social media strategist for LinkedIn, Twitter, and professional platforms. Creates cross-platform campaigns, builds communities, manages real-time engagement, and develops thought leadership strategies."
            }
          ]
        },
        {
          "id": "aa-marketing-tiktok-strategist",
          "name": "TikTok Strategist",
          "role": "TikTok Strategist",
          "remit": "Expert TikTok marketing specialist focused on viral content creation, algorithm optimization, and community building.",
          "owns": "Rides the algorithm and builds community through authentic TikTok culture.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the TikTok Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert TikTok marketing specialist focused on viral content creation, algorithm optimization, and community building. Masters TikTok's unique culture and features for brand growth."
            }
          ]
        },
        {
          "id": "aa-marketing-twitter-engager",
          "name": "Twitter Engager",
          "role": "Twitter Engager",
          "remit": "Expert Twitter marketing specialist focused on real-time engagement, thought leadership building, and community-driven growth.",
          "owns": "Builds thought leadership and brand authority 280 characters at a time.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Twitter Engager role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert Twitter marketing specialist focused on real-time engagement, thought leadership building, and community-driven growth. Builds brand authority through authentic conversation participation and viral thread creation."
            }
          ]
        },
        {
          "id": "aa-marketing-video-optimization-specialist",
          "name": "Video Optimization Specialist",
          "role": "Video Optimization Specialist",
          "remit": "Video marketing strategist specializing in YouTube algorithm optimization, audience retention, chaptering, thumbnail concepts, and cross-platform video syndication.",
          "owns": "Energetic, data-driven, strategic, and hyper-focused on audience retention",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Video Optimization Specialist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Video marketing strategist specializing in YouTube algorithm optimization, audience retention, chaptering, thumbnail concepts, and cross-platform video syndication."
            }
          ]
        },
        {
          "id": "aa-marketing-wechat-official-account",
          "name": "WeChat Official Account Manager",
          "role": "WeChat Official Account Manager",
          "remit": "Expert WeChat Official Account (OA) strategist specializing in content marketing, subscriber engagement, and conversion optimization.",
          "owns": "Grows loyal WeChat subscriber communities through consistent value delivery.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the WeChat Official Account Manager role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert WeChat Official Account (OA) strategist specializing in content marketing, subscriber engagement, and conversion optimization. Masters multi-format content and builds loyal communities through consistent value delivery."
            }
          ]
        },
        {
          "id": "aa-marketing-weibo-strategist",
          "name": "Weibo Strategist",
          "role": "Weibo Strategist",
          "remit": "Full-spectrum operations expert for Sina Weibo, with deep expertise in trending topic mechanics, Super Topic community management, public sentiment monitoring, fan economy strategies, and Weibo advertising, helping brands achieve viral reach and sustained growth on China's leading public discourse platform.",
          "owns": "Makes your brand trend on Weibo and keeps the conversation going.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Weibo Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Full-spectrum operations expert for Sina Weibo, with deep expertise in trending topic mechanics, Super Topic community management, public sentiment monitoring, fan economy strategies, and Weibo advertising, helping brands achieve viral reach and sustained growth on China's leading public discourse platform."
            }
          ]
        },
        {
          "id": "aa-marketing-x-twitter-intelligence-analyst",
          "name": "X/Twitter Intelligence Analyst",
          "role": "X/Twitter Intelligence Analyst",
          "remit": "Social intelligence specialist for X/Twitter research, trend detection, account monitoring, and evidence-backed audience insights using public signals and structured data workflows.",
          "owns": "Turns noisy X conversations into sourced market, audience, and risk intelligence.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the X/Twitter Intelligence Analyst role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Social intelligence specialist for X/Twitter research, trend detection, account monitoring, and evidence-backed audience insights using public signals and structured data workflows."
            }
          ]
        },
        {
          "id": "aa-marketing-xiaohongshu-specialist",
          "name": "Xiaohongshu Specialist",
          "role": "Xiaohongshu Specialist",
          "remit": "Expert Xiaohongshu marketing specialist focused on lifestyle content, trend-driven strategies, and authentic community engagement.",
          "owns": "Masters lifestyle content and aesthetic storytelling on 小红书.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Xiaohongshu Specialist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert Xiaohongshu marketing specialist focused on lifestyle content, trend-driven strategies, and authentic community engagement. Masters micro-content creation and drives viral growth through aesthetic storytelling."
            }
          ]
        },
        {
          "id": "aa-marketing-zhihu-strategist",
          "name": "Zhihu Strategist",
          "role": "Zhihu Strategist",
          "remit": "Expert Zhihu marketing specialist focused on thought leadership, community credibility, and knowledge-driven engagement.",
          "owns": "Builds brand authority through expert knowledge-sharing on 知乎.",
          "tags": [
            "Marketing",
            "Agentic"
          ],
          "skills": [
            {
              "label": "Work with me",
              "task": "Adopt the Zhihu Strategist role and tell me what you need to start."
            },
            {
              "label": "What do you own?",
              "task": "State your remit, your hard rules, and what you refuse to do."
            },
            {
              "label": "Take this on",
              "task": "Expert Zhihu marketing specialist focused on thought leadership, community credibility, and knowledge-driven engagement. Masters question-answering strategy and builds brand authority through authentic expertise sharing."
            }
          ]
        }
      ]
    }
  ]
}

const BUILD = DATA.build

// ── Teams ─────────────────────────────────────────────────────────────────
// In the download-on-demand build, DATA.registry carries team METADATA only
// (no contracts). The heavy prose lives in teams/<id>.json on GitHub and is
// fetched + cached at runtime. Members therefore start with an empty contract
// here; augmentTeam() fills it from the cache before any run.

const TEAMS = DATA.registry.map((team) => ({
  id: team.id,
  name: team.name,
  avatar: team.avatar,
  // build.mjs emits memberTone, but an earlier build dropped it here, so every
  // member fell back to the team tone and the roster looked like one colour.
  memberTone: team.memberTone || (team.avatar && team.avatar.tone) || 'indigo',
  remit: team.remit,
  startNote: team.startNote || '',
  ported: !!team.ported,
  lead: team.lead,
  leadHead: team.leadHead || '',
  leadTail: team.leadTail || '',
  leadSkills: team.leadSkills || [],
  skills: team.skills || [],
  members: team.members.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    remit: m.remit || '',
    owns: m.owns || '',
    tags: m.tags || [],
    ported: !!team.ported,
    contract: m.contract || '',
    skills: m.skills || [],
  })),
}))

// ── Experts (the Experts tab) ─────────────────────────────────────────────
// Everyone on every team, solo. Leads run their team; members run alone.
// Derived, so the roster is never written down twice.

const EXPERTS = []

TEAMS.forEach((team) => {
  EXPERTS.push({
    id: team.lead.id,
    name: team.lead.name + ' — ' + team.lead.role,
    teamId: team.id,
    teamName: team.name,
    avatar: {
      letter: (team.lead.name || '?').charAt(0),
      tone: team.ported ? team.avatar.tone : 'amber',
    },
    remit: team.lead.remit || 'Leads the ' + team.name + ' team.',
    ported: team.ported,
    startNote: team.startNote,
    run: { kind: 'lead', team: team.id },
    tags: (team.lead && team.lead.tags) || [],
    skills: team.leadSkills || [],
  })

  team.members.forEach((m) => {
    EXPERTS.push({
      id: m.id,
      name: m.name + ' — ' + m.role,
      teamId: team.id,
      teamName: team.name,
      avatar: {
        letter: (m.name || '?').charAt(0),
        tone: team.ported ? (team.memberTone || team.avatar.tone) : 'amber',
      },
      remit: m.remit || team.name + ' team · ' + m.role + '.',
      ported: m.ported,
      startNote: team.startNote,
      run: { kind: 'solo', agent: m.id },
      tags: m.tags || [],
      skills: m.skills || [],
    })
  })
})

const TOTAL_AGENTS = EXPERTS.length

// ── Download-on-demand: GitHub payloads cached in localStorage ─────────────
// The registry above is bundled, so the whole catalog is browseable offline.
// A team's full contract prose lives in teams/<id>.json on GitHub. Installing
// (or summoning) a team fetches that file once and caches it here, after which
// the team runs with no network. Clearing app data wipes this cache, which is
// why the page also offers Export / Import of the cache as a file.

const LS_PAYLOADS = 'experts:payloads:v1'
const LS_BASE_OVERRIDE = 'experts:github-base-override'

let _payloads = _loadPayloads()

function _loadPayloads() {
  try {
    return JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(LS_PAYLOADS)) || '{}') || {}
  } catch (e) {
    return {}
  }
}

function _savePayloads() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LS_PAYLOADS, JSON.stringify(_payloads))
  } catch (e) {
    /* quota or no storage — degrade to session-only */
  }
}

/** A localStorage key lets you repoint the plugin at a fork or a local server
 *  without rebuilding: set experts:github-base-override to e.g.
 *  http://localhost:8080/teams  (no trailing slash needed). */
function _githubBase() {
  try {
    if (typeof localStorage !== 'undefined') {
      const ov = localStorage.getItem(LS_BASE_OVERRIDE)
      if (ov) return ov.replace(/\/+$/, '') + '/'
    }
  } catch (e) {
    /* noop */
  }
  return (DATA.base || '').replace(/\/+$/, '') + '/'
}

function isInstalled(teamId) {
  return !!_payloads[teamId]
}

async function fetchPayload(teamId) {
  const url = _githubBase() + teamId + '.json'
  let res
  try {
    res = await fetch(url)
  } catch (e) {
    throw new Error('network error fetching "' + teamId + '": ' + e.message)
  }
  if (!res || !res.ok) {
    throw new Error(
      'could not download "' + teamId + '" (' + (res ? res.status : 'no response') +
      ') — connect to the internet and try again, or install while online'
    )
  }
  let p
  try {
    p = await res.json()
  } catch (e) {
    throw new Error('corrupt payload for "' + teamId + '"')
  }
  return p
}

/** Returns the cached payload, fetching + caching it first if absent. */
async function ensurePayload(teamId) {
  if (_payloads[teamId]) return _payloads[teamId]
  const p = await fetchPayload(teamId)
  _payloads[teamId] = p
  _savePayloads()
  return p
}

function installTeam(teamId) {
  return ensurePayload(teamId)
}

function uninstallTeam(teamId) {
  delete _payloads[teamId]
  _savePayloads()
}

/** Merge a cached payload's prose into a lightweight registry team so the
 *  persona builders see contracts, leadHead and leadTail. No-op if not yet
 *  downloaded (the run path calls ensurePayload first). */
function augmentTeam(team) {
  const p = _payloads[team.id]
  if (!p) return team
  return {
    ...team,
    leadHead: p.leadHead || team.leadHead || '',
    leadTail: p.leadTail || team.leadTail || '',
    members: team.members.map((m) => ({
      ...m,
      contract: (p.members && p.members[m.id]) || m.contract || '',
    })),
  }
}

function exportCache() {
  try {
    const blob = new Blob([JSON.stringify(_payloads, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hermes-experts-cache.json'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    notifyError('Export failed: ' + (e && e.message ? e.message : 'unknown'))
  }
}

function importCache(text) {
  try {
    const incoming = JSON.parse(text)
    if (!incoming || typeof incoming !== 'object') throw new Error('not a cache object')
    _payloads = Object.assign({}, _payloads, incoming)
    _savePayloads()
    notify('Imported ' + Object.keys(incoming).length + ' team(s) into the cache', 'info')
  } catch (e) {
    notifyError('Import failed: ' + (e && e.message ? e.message : 'invalid file'))
  }
}

// ── Selection pub-sub ──────────────────────────────────────────────────────
// The composer pill and the status-bar indicator both need to know which
// expert the user has currently picked. They are two separate React trees
// (the page in the workspace pane, the chip in the status bar) with no
// shared state, so a tiny module-level pub-sub is the cleanest way to
// bridge them.
//
//   publishSelection(expert)  — set/clear; called by the page on Summon
//                               and on × clear
//   readSelection()           — current value (or null)
//   subscribeSelection(fn)     — called on every change; returns an
//                               unsubscribe
//
// Listeners are best-effort: a throwing listener does not block the others
// or the state update.

let _activeSelection = null
const _selectionSubs = new Set()
function publishSelection(expert) {
  _activeSelection = expert
  for (const fn of _selectionSubs) {
    try { fn(expert) } catch (e) { /* best-effort: don't let a listener crash the publish */ }
  }
}
function readSelection() {
  return _activeSelection
}
function subscribeSelection(fn) {
  _selectionSubs.add(fn)
  return function unsubscribe() { _selectionSubs.delete(fn) }
}

// ── Personas ──────────────────────────────────────────────────────────────

function findAgent(agentId) {
  for (let i = 0; i < TEAMS.length; i++) {
    const team = TEAMS[i]
    for (let j = 0; j < team.members.length; j++) {
      if (team.members[j].id === agentId) {
        return { team: team, member: team.members[j] }
      }
    }
  }
  return null
}

function teamById(teamId) {
  return TEAMS.filter((entry) => entry.id === teamId)[0] || null
}

function soloPersona(member, team) {
  return [
    'You are ' + member.name + ' — ' + member.role + ', a specialist on the ' + team.name + ' team.',
    '',
    member.contract,
    '',
    DATA.soloTail,
  ].join('\n')
}

/**
 * The lead's system prompt: its own head, then every member contract inline,
 * then its own tail. The contracts have to be inline because a Hermes child
 * starts with an empty conversation — the only way it learns a member's
 * standard is for the lead to paste the contract into `context`.
 */
function leadPersona(team) {
  const contracts = team.members
    .map((m) => m.contract)
    .filter(Boolean)
    .join('\n\n')
  return [
    team.leadHead,
    '',
    '## MEMBER CONTRACTS',
    '',
    'These are the specialists on your team. Paste the relevant one into the',
    '`context` of every delegation, unchanged.',
    '',
    contracts,
    '',
    team.leadTail,
  ].join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════
// Theme — read the app's own palette; see the header note.
// ═══════════════════════════════════════════════════════════════════════════

const DARK_BG = '#0d1117'
const LIGHT_BG = '#ffffff'
const DARK_FG = '#e6edf3'
const LIGHT_FG = '#1f2328'

function channelList(color) {
  const match = /^rgba?\(([^)]+)\)$/i.exec(String(color || '').trim())
  if (!match) return null
  return match[1].split(',').map((part) => part.trim())
}

function rgbOf(color) {
  const parts = channelList(color)
  if (!parts || parts.length < 3) return null
  const rgb = parts.slice(0, 3).map(Number)
  return rgb.every((value) => isFinite(value)) ? rgb : null
}

function alphaOf(color) {
  const parts = channelList(color)
  if (!parts || parts.length < 4) return 1
  const alpha = Number(parts[3])
  return isFinite(alpha) ? alpha : 1
}

function isLight(rgb) {
  if (!rgb) return false
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2] > 150
}

function withAlpha(color, alpha) {
  const rgb = rgbOf(color)
  if (!rgb) return 'rgba(128,128,128,' + alpha + ')'
  return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')'
}

function theme() {
  let fg = ''
  let bg = ''
  try {
    const computed = window.getComputedStyle(document.body)
    fg = computed.color || ''
    bg = computed.backgroundColor || ''
  } catch (e) {
    /* no window — never happens in Desktop; fall through to the defaults */
  }

  if (!bg || alphaOf(bg) < 0.55) bg = ''

  const fgRgb = rgbOf(fg)
  const bgRgb = rgbOf(bg)

  if (!bg) bg = isLight(fgRgb) ? LIGHT_BG : DARK_BG
  if (!fg) fg = isLight(bgRgb || rgbOf(bg)) ? LIGHT_FG : DARK_FG

  return {
    bg: bg,
    fg: fg,
    panel: withAlpha(fg, 0.06),
    panelHover: withAlpha(fg, 0.12),
    hairline: withAlpha(fg, 0.22),
    muted: withAlpha(fg, 0.60),
    faint: withAlpha(fg, 0.42),
  }
}

// ── Guarded host surface ──────────────────────────────────────────────────
// A renamed or absent verb must degrade, never throw into React's render path.

function tap() {
  try { if (typeof haptic === 'function') haptic('tap') } catch (e) { /* noop */ }
}

function go(path) {
  try {
    if (host && typeof host.navigate === 'function') { host.navigate(path); return }
  } catch (e) { /* fall through to the hash route */ }
  try { window.location.hash = '#' + path } catch (e) { /* noop */ }
}

function notify(message, kind) {
  try {
    if (host && typeof host.notify === 'function') {
      host.notify({ kind: kind || 'info', title: 'Experts', message: message })
      return
    }
  } catch (e) { /* fall through */ }
  try { console.log('[experts]', message) } catch (e) { /* noop */ }
}

function notifyError(message) {
  try {
    if (host && typeof host.notify === 'function') {
      host.notify({ kind: 'error', title: 'Experts', message: message })
      return
    }
  } catch (e) { /* fall through */ }
  try { console.error('[experts]', message) } catch (e) { /* noop */ }
}

function currentSessionId() {
  try {
    const state = host && host.state
    if (!state) return null
    const focused = state.focusedSessionId
    if (focused && typeof focused.get === 'function') {
      const id = focused.get()
      if (id) return id
    }
    const active = state.activeSessionId
    if (active && typeof active.get === 'function') {
      const id = active.get()
      if (id) return id
    }
    return null
  } catch (e) {
    return null
  }
}

function currentCwd() {
  try {
    const state = host && host.state
    if (state && state.cwd && typeof state.cwd.get === 'function') {
      const cwd = state.cwd.get()
      if (cwd) return String(cwd)
    }
  } catch (e) { /* noop */ }
  return ''
}

/**
 * host.request hands back whatever the gateway client returns. Depending on
 * the transport it is either the JSON-RPC envelope ({ok, result}) or the bare
 * result, so accept both rather than betting on one.
 */
function unwrap(res) {
  if (!res || typeof res !== 'object') return {}
  if (res.result && typeof res.result === 'object') return res.result
  return res
}

function rpcFailure(res) {
  if (!res || typeof res !== 'object') return null
  if (res.ok === false) {
    const err = res.error
    if (!err) return 'request failed'
    if (typeof err === 'string') return err
    return err.message || String(err)
  }
  return null
}

async function rpc(method, params) {
  if (!host || typeof host.request !== 'function') {
    throw new Error('host.request unavailable')
  }
  const res = await host.request(method, params)
  const failure = rpcFailure(res)
  if (failure) throw new Error(method + ': ' + failure)
  return unwrap(res)
}

/**
 * Spawn one session for one persona and hand it the task.
 *
 * Nothing here touches the user's current session or their profile. The new
 * session inherits the ambient profile (whatever the desktop is actually
 * running) and the focused session's cwd.
 */
async function startRun(spec) {
  const params = {
    messages: [{ role: 'system', content: spec.persona }],
    title: spec.title,
    parent_session_id: currentSessionId() || null,
  }
  const cwd = currentCwd()
  if (cwd) params.cwd = cwd

  const created = await rpc('session.create', params)
  const sessionId = created.session_id
  const storedId = created.stored_session_id
  if (!sessionId) throw new Error('session.create returned no session_id')

  await rpc('prompt.submit', { session_id: sessionId, text: spec.task })

  // Show it. openSession is the plugin path core surfaces use; if it is not
  // there (older build) or it refuses a brand-new session, land on chat.
  try {
    if (storedId && host && typeof host.openSession === 'function') {
      await host.openSession(storedId, { expectHistory: true })
      return storedId
    }
  } catch (e) {
    notify('Started "' + spec.title + '" — open it from the session list.', 'info')
  }
  go('/')
  return storedId || sessionId
}

function runSolo(agentId, task) {
  const found = findAgent(agentId)
  if (!found || !found.member.ported) {
    return Promise.reject(new Error('expert not translated yet: ' + agentId))
  }
  // Download + cache the team's contracts on the fly (works offline once cached).
  return ensurePayload(found.team.id).then((payload) => {
    const team = augmentTeam(found.team)
    const member = team.members.filter((m) => m.id === agentId)[0]
    if (!member || !member.contract) {
      return Promise.reject(new Error('expert not translated yet: ' + agentId))
    }
    return startRun({
      title: member.name + ' · ' + member.role,
      persona: soloPersona(member, team),
      task: task,
    })
  })
}

function runLead(teamId, task) {
  const team = teamById(teamId)
  if (!team || !team.ported) return Promise.reject(new Error('team not ported: ' + teamId))
  return ensurePayload(teamId).then((payload) => {
    const t = augmentTeam(team)
    if (!t.leadHead) return Promise.reject(new Error('team not downloaded: ' + teamId))
    return startRun({
      title: team.name + ' · ' + team.lead.name,
      persona: leadPersona(t),
      task: task,
    })
  })
}

// ── Error boundary: a throw shows a message instead of a blank pane ────────

class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }

  static getDerivedStateFromError(err) {
    return { err: err }
  }

  componentDidCatch(err) {
    try { console.error('[experts] render error:', err) } catch (e) { /* noop */ }
  }

  render() {
    if (this.state.err) {
      const t = theme()
      return jsx('div', {
        style: {
          boxSizing: 'border-box',
          width: '100%',
          height: '100%',
          minHeight: '320px',
          background: t.bg,
          color: t.fg,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          fontFamily: 'inherit',
          overflowY: 'auto',
        },
        children: [
          jsx('div', {
            key: 'title',
            style: { fontWeight: 600, fontSize: 15 },
            children: 'Experts: the page threw while rendering',
          }),
          jsx('pre', {
            key: 'msg',
            style: {
              margin: 0,
              whiteSpace: 'pre-wrap',
              fontSize: 12,
              color: t.muted,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            },
            children: String((this.state.err && this.state.err.message) || this.state.err),
          }),
          jsx('button', {
            key: 'close',
            type: 'button',
            style: {
              alignSelf: 'flex-start',
              marginTop: 8,
              padding: '6px 14px',
              fontSize: 13,
              borderRadius: 6,
              border: '1px solid ' + t.hairline,
              background: t.panel,
              color: t.fg,
              cursor: 'pointer',
            },
            onClick: () => go('/'),
            children: 'Back to chat',
          }),
        ],
      })
    }
    return this.props.children
  }
}

// ── Pieces ────────────────────────────────────────────────────────────────

const TONES = {
  indigo: { fg: '#6366f1', bg: 'rgba(99,102,241,0.18)' },
  emerald: { fg: '#10b981', bg: 'rgba(16,185,129,0.18)' },
  sky: { fg: '#0ea5e9', bg: 'rgba(14,165,233,0.18)' },
  rose: { fg: '#f43f5e', bg: 'rgba(244,63,94,0.18)' },
  amber: { fg: '#f59e0b', bg: 'rgba(245,158,11,0.18)' },
  violet: { fg: '#8b5cf6', bg: 'rgba(139,92,246,0.18)' },
}

function Avatar({ letter, tone, t, size }) {
  const color = TONES[tone] || TONES.indigo
  const box = size || 34
  return jsx('div', {
    style: {
      width: box,
      height: box,
      flex: '0 0 ' + box + 'px',
      // Ratio-derived so the 34px card avatar is unchanged (9 / 14) and a
      // 20px roster chip stays proportionally round.
      borderRadius: Math.round(box * 0.26),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: Math.round(box * 0.41),
      fontWeight: 600,
      background: color.bg,
      color: color.fg,
    },
    children: letter,
  })
}

// ── A member's avatar, derived exactly the way that member's own EXPERTS
// entry is (see the EXPERTS derivation above). Without this the roster would
// invent a second identity for someone who already has a card in the Experts
// tab — same person, two different chips.
function memberAvatar(member, team) {
  return {
    letter: (member.name || '?').charAt(0),
    tone: team && team.ported
      ? (team.memberTone || (team.avatar && team.avatar.tone) || 'indigo')
      : 'amber',
  }
}

// ── Tag — decorative role/profession label, like WorkBuddy's card tags ─────
// Non-interactive on purpose. The card is the action target; tags just say
// what the expert is.

function Tag({ label, t }) {
  return jsx('span', {
    style: {
      padding: '3px 9px',
      fontSize: 11,
      lineHeight: 1.4,
      borderRadius: 999,
      border: '1px solid ' + t.hairline,
      background: withAlpha(t.fg, 0.05),
      color: t.muted,
      whiteSpace: 'nowrap',
    },
    children: label,
  })
}

// ── TeamRoster — "who is actually in this team" ────────────────────────────
// A team card used to show only its lead, so the team was a name with no
// members behind it. WorkBuddy states the roster up front: the team
// description names the count ("7 roles in 5 phases", "5-member team
// covering…") and the members are listed with their own avatars.
//
// The lead is listed first and marked — the lead is the thing you summon, and
// WorkBuddy's own members[] carries a role: 'lead' flag on the same person.
// `owns` is the one line that says what a member is for, so the modal shows it
// and the card does not (a 280px card cannot take nine of them).

function TeamRoster({ team, t, limit, showOwns, size }) {
  const rows = []
  const lead = team.lead
  if (lead) {
    rows.push({ id: lead.id, name: lead.name, role: lead.role, owns: '', isLead: true })
  }
  for (let i = 0; i < team.members.length; i++) {
    const m = team.members[i]
    rows.push({ id: m.id, name: m.name, role: m.role, owns: m.owns || '', isLead: false })
  }

  const shown = limit && rows.length > limit ? rows.slice(0, limit) : rows
  const hidden = rows.length - shown.length
  const chip = size || 20

  return jsx('div', {
    style: { display: 'flex', flexDirection: 'column', gap: showOwns ? 8 : 5 },
    children: shown
      .map((row) => {
        const avatar = row.isLead
          ? { letter: (row.name || '?').charAt(0), tone: team.ported ? (team.avatar && team.avatar.tone) || 'indigo' : 'amber' }
          : memberAvatar(row, team)

        return jsx('div', {
          key: row.id,
          style: { display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0 },
          children: [
            jsx(Avatar, { key: 'a', letter: avatar.letter, tone: avatar.tone, t: t, size: chip }),
            jsx('div', {
              key: 'txt',
              style: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 },
              children: [
                jsx('div', {
                  key: 'name',
                  style: { fontSize: 12, lineHeight: 1.35, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
                  children: [
                    jsx('span', { key: 'n', style: { fontWeight: 600 }, children: row.name }),
                    jsx('span', { key: 'r', style: { color: t.muted }, children: row.role }),
                    row.isLead
                      ? jsx('span', {
                          key: 'lead',
                          style: {
                            padding: '1px 6px',
                            fontSize: 10,
                            borderRadius: 999,
                            border: '1px solid ' + withAlpha(ACCENT, 0.5),
                            background: withAlpha(ACCENT, 0.18),
                            color: t.fg,
                          },
                          children: 'Lead',
                        })
                      : null,
                  ],
                }),
                showOwns && row.owns
                  ? jsx('div', { key: 'owns', style: { fontSize: 11, color: t.faint, lineHeight: 1.4 }, children: row.owns })
                  : null,
              ],
            }),
          ],
        })
      })
      .concat(
        hidden > 0
          ? [
              jsx('div', {
                key: 'more',
                style: { fontSize: 11, color: t.faint, paddingLeft: (chip + 8) + 'px' },
                children: '+ ' + hidden + ' more',
              }),
            ]
          : []
      ),
  })
}

// ── ExpertCard — the only thing a user clicks on the grid ──────────────────
// Whole card is a button. Layout matches WorkBuddy's expert menu: avatar +
// role as headline, name as subtitle, description, then tags at the bottom.

function ExpertCard({ item, role, name, tags, t, onOpen, team, installed, onInstall, installing }) {
  const pending = !item.ported
  const notDownloaded = !pending && !installed

  // Team cards get a real Install button (install = fetch + cache the whole
  // team in one request). Solo expert cards show a small "download on use"
  // chip, because summoning them auto-installs their team on the fly.
  const installBtn = team && !pending
    ? jsx('button', {
        key: 'install',
        type: 'button',
        disabled: !!installed || !!installing,
        onClick: (e) => { e.stopPropagation(); tap(); if (onInstall) onInstall() },
        style: {
          alignSelf: 'flex-start',
          marginTop: 2,
          padding: '5px 12px',
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 7,
          cursor: (installed || installing) ? 'default' : 'pointer',
          border: '1px solid ' + (installed ? t.hairline : ACCENT),
          background: installed ? 'transparent' : withAlpha(ACCENT, 0.14),
          color: installed ? t.muted : t.fg,
          whiteSpace: 'nowrap',
        },
        children: installed ? 'Installed' : (installing ? 'Installing…' : 'Install'),
      })
    : null

  const cloudBadge = !team && notDownloaded
    ? jsx('span', {
        key: 'cloud',
        title: 'Not cached yet — summoning downloads it once, then it works offline',
        style: {
          fontSize: 10, padding: '1px 6px', borderRadius: 999,
          border: '1px solid ' + t.hairline, color: t.faint, whiteSpace: 'nowrap',
        },
        children: '☁ download on use',
      })
    : null

  return jsx('div', {
    role: 'button',
    tabIndex: 0,
    onClick: () => { if (!pending && onOpen) { tap(); onOpen() } },
    onKeyDown: (e) => { if (!pending && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen && onOpen() } },
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: 14,
      borderRadius: 10,
      border: '1px solid ' + (pending ? t.hairline : t.hairline),
      background: pending ? 'transparent' : t.panel,
      opacity: pending ? 0.6 : (notDownloaded ? 0.92 : 1),
      cursor: pending ? 'default' : 'pointer',
      userSelect: 'none',
      transition: 'transform 80ms ease',
    },
    children: [
      jsx('div', {
        key: 'head',
        style: { display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 },
        children: [
          jsx(Avatar, {
            key: 'a',
            letter: item.avatar.letter,
            tone: pending ? 'amber' : item.avatar.tone,
            t: t,
          }),
          jsx('div', {
            key: 'names',
            style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 },
            children: [
              jsx('div', {
                key: 'role',
                style: { fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 },
                children: role || item.name,
              }),
              jsx('div', {
                key: 'name',
                style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, color: t.faint, lineHeight: 1.3 },
                children: [name || '', cloudBadge].filter(Boolean),
              }),
            ],
          }),
        ],
      }),
      jsx('div', {
        key: 'remit',
        style: {
          fontSize: 12,
          lineHeight: 1.5,
          color: t.muted,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        },
        children: item.remit,
      }),
      // The roster. A team card is the only place this appears; solo experts
      // have no team, so `team` is null and the block is skipped.
      team
        ? jsx('div', {
            key: 'roster',
            style: { display: 'flex', flexDirection: 'column', gap: 6 },
            children: [
              jsx('div', {
                key: 'label',
                style: { fontSize: 10, color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
                children: 'Team · ' + (team.members.length + (team.lead ? 1 : 0)),
              }),
              jsx(TeamRoster, { key: 'rows', team: team, t: t, limit: 3, showOwns: false, size: 20 }),
            ],
          })
        : null,
      tags && tags.length
        ? jsx('div', {
            key: 'tags',
            style: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 'auto' },
            children: tags.map((label) => jsx(Tag, { key: label, label: label, t: t })),
          })
        : null,
      installBtn,
    ],
  })
}

function TabBar({ active, onSelect, t }) {
  return jsx('div', {
    style: { display: 'flex', alignItems: 'center', gap: 6 },
    children: TABS.map((tab) => {
      const on = active === tab.id
      return jsx('button', {
        key: tab.id,
        type: 'button',
        style: {
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 500,
          borderRadius: 8,
          cursor: 'pointer',
          border: '1px solid ' + (on ? ACCENT : t.hairline),
          background: on ? withAlpha(ACCENT, 0.16) : 'transparent',
          color: on ? t.fg : t.muted,
        },
        onClick: () => { tap(); onSelect(tab.id) },
        children: tab.label,
      })
    }),
  })
}

// ── Detail view ────────────────────────────────────────────────────────────
// Reached by clicking a card's header. Shows the contract summary a run will
// carry, the recommended first line of every run, the skill quick-runs, and a
// single Start button. No new session is opened until the user clicks Start.

// ── ExpertModal — what the card click opens ────────────────────────────────
// Shows the expert's remit and tags and a single Summon button. Closing the
// modal puts the expert into the bottom composer; nothing runs until Send.

function ExpertModal({ expert, role, name, tags, t, onClose, onSummon, team, installed }) {
  const isLead = expert.run && expert.run.kind === 'lead'

  return jsx('div', {
    // Backdrop. position: absolute so it covers the pane, not the whole window
    // (an earlier build used position: fixed and covered the titlebar; we keep
    // the dialog inside the workspace).
    style: {
      position: 'absolute',
      inset: 0,
      background: withAlpha(t.fg, 0.32),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
    },
    onClick: (e) => { if (e.target === e.currentTarget) onClose() },
    children: jsx('div', {
      role: 'dialog',
      'aria-modal': 'true',
      style: {
        boxSizing: 'border-box',
        width: 'min(520px, calc(100% - 40px))',
        maxHeight: 'calc(100% - 40px)',
        overflowY: 'auto',
        background: t.bg,
        color: t.fg,
        border: '1px solid ' + t.hairline,
        borderRadius: 12,
        padding: 22,
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      },
      onClick: (e) => e.stopPropagation(),
      children: [
        jsx('div', {
          key: 'head',
          style: { display: 'flex', gap: 12, alignItems: 'center' },
          children: [
            jsx(Avatar, { key: 'a', letter: expert.avatar.letter, tone: expert.avatar.tone, t: t }),
            jsx('div', {
              key: 'n',
              style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 },
              children: [
                jsx('div', { key: 'role', style: { fontSize: 16, fontWeight: 650 }, children: role || expert.name }),
                jsx('div', { key: 'name', style: { fontSize: 12, color: t.faint }, children: (name ? name + ' · ' : '') + expert.teamName + (isLead ? ' · Team lead' : '') }),
              ],
            }),
            jsx('button', {
              key: 'x',
              type: 'button',
              'aria-label': 'Close',
              onClick: onClose,
              style: {
                width: 28, height: 28, flex: '0 0 28px',
                borderRadius: 6,
                border: '1px solid ' + t.hairline,
                background: t.panel,
                color: t.muted,
                cursor: 'pointer',
                fontSize: 16, lineHeight: 1,
              },
              children: '×',
            }),
          ],
        }),
        jsx('div', {
          key: 'body',
          style: { display: 'flex', flexDirection: 'column', gap: 6 },
          children: [
            jsx('div', {
              key: 'label',
              style: { fontSize: 10, color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
              children: 'What they do',
            }),
            jsx('div', { key: 'remit', style: { fontSize: 13, lineHeight: 1.55, color: t.muted }, children: expert.remit }),
          ],
        }),
        // Full roster, uncapped, with what each member owns. This is the
        // "who is in this team" answer the card can only summarise. Shows for
        // a lead whether you opened it from the Teams tab or the Experts tab.
        team
          ? jsx('div', {
              key: 'rosterBlock',
              style: { display: 'flex', flexDirection: 'column', gap: 8 },
              children: [
                jsx('div', {
                  key: 'label',
                  style: { fontSize: 10, color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
                  children: 'Team · ' + (team.members.length + (team.lead ? 1 : 0)) + ' experts',
                }),
                jsx(TeamRoster, { key: 'rows', team: team, t: t, limit: 0, showOwns: true, size: 22 }),
              ],
            })
          : null,
        tags && tags.length
          ? jsx('div', {
              key: 'tagsBlock',
              style: { display: 'flex', flexDirection: 'column', gap: 6 },
              children: [
                jsx('div', {
                  key: 'label',
                  style: { fontSize: 10, color: t.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
                  children: 'Tags',
                }),
                jsx('div', {
                  key: 'tags',
                  style: { display: 'flex', flexWrap: 'wrap', gap: 6 },
                  children: tags.map((label) => jsx(Tag, { key: label, label: label, t: t })),
                }),
              ],
            })
          : null,
        jsx('button', {
          key: 'summon',
          type: 'button',
          style: {
            marginTop: 4,
            padding: '11px 16px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 9,
            cursor: 'pointer',
            border: '1px solid ' + ACCENT,
            background: withAlpha(ACCENT, 0.20),
            color: t.fg,
          },
          onClick: onSummon,
          children: (installed ? 'Summon ' : 'Download & summon ') + (isLead ? 'team' : 'expert') + ' — ' + (expert.startNote || 'add to composer'),
        }),
        jsx('div', {
          key: 'note',
          style: { fontSize: 11, color: t.faint },
          children: 'Adds this expert to the composer below. You can swap it before sending.',
        }),
      ],
    }),
  })
}

// ── Search ────────────────────────────────────────────────────────────────
// At 32 agents the grid is unusable without it. Deliberately dumb: one
// substring test over the text a user would actually type.

function haystack(item, isTeam) {
  if (isTeam) {
    return [item.name, item.remit, item.lead.name, item.lead.role, item.id]
      .concat(item.members.map((m) => m.name + ' ' + m.role + ' ' + m.id + ' ' + (m.owns || '')))
      .join('  ')
  }
  return [item.name, item.remit, item.id, item.teamName].join('  ')
}

// ── Composer — the bottom bar that holds the chosen expert and the message ─
// One expert at a time. The card click → modal → Summon path lands here. The
// Send button is the only thing that actually spawns a session.

function Composer({ selected, text, busy, t, onText, onClear, onSend }) {
  const canSend = !!selected && !busy
  return jsx('div', {
    style: {
      boxSizing: 'border-box',
      flex: '0 0 auto',
      padding: '12px 16px',
      borderTop: '1px solid ' + t.hairline,
      background: t.bg,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    },
    children: [
      jsx('div', {
        key: 'row',
        style: { display: 'flex', alignItems: 'center', gap: 8, minHeight: 32, flexWrap: 'wrap' },
        children: selected
          ? [
              // The expert pill — avatar + name, with a × to deselect.
              jsx('div', {
                key: 'pill',
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '3px 10px 3px 3px',
                  borderRadius: 999,
                  border: '1px solid ' + withAlpha(ACCENT, 0.6),
                  background: withAlpha(ACCENT, 0.12),
                },
                children: [
                  jsx(Avatar, { key: 'av', letter: selected.avatar.letter, tone: selected.avatar.tone, t: t }),
                  jsx('span', {
                    key: 'name',
                    style: { fontSize: 12.5, fontWeight: 600, color: t.fg },
                    children: (selected.run && selected.run.kind === 'lead')
                      ? selected.name
                      : (selected.name.split(' — ')[0] || selected.name),
                  }),
                  jsx('button', {
                    key: 'x',
                    type: 'button',
                    'aria-label': 'Remove expert',
                    onClick: onClear,
                    style: {
                      width: 20, height: 20,
                      borderRadius: 999,
                      border: 'none',
                      background: withAlpha(t.fg, 0.10),
                      color: t.muted,
                      cursor: 'pointer',
                      fontSize: 12, lineHeight: 1,
                      marginLeft: 2,
                    },
                    children: '×',
                  }),
                ],
              }),
              jsx('span', {
                key: 'hint',
                style: { fontSize: 11, color: t.faint },
                children: 'Starts with: ' + (selected.startNote || 'summoning team/expert'),
              }),
            ]
          : jsx('span', {
              key: 'empty',
              style: { fontSize: 12, color: t.faint },
              children: 'Pick an expert above to start a session.',
            }),
      }),
      jsx('div', {
        key: 'inputRow',
        style: { display: 'flex', gap: 8, alignItems: 'stretch' },
        children: [
          jsx('input', {
            key: 'input',
            type: 'text',
            value: text,
            onChange: (e) => onText(e.target.value),
            onKeyDown: (e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) onSend() }
              if (e.key === 'Escape' && selected) onClear()
            },
            placeholder: selected
              ? ((selected.run && selected.run.kind === 'lead')
                  ? 'What should the team work on? (Enter to send)'
                  : 'Type your message — Enter to send')
              : 'Type your message — Enter to send',
            disabled: !selected || busy,
            autoFocus: !!selected,
            style: {
              flex: 1,
              padding: '9px 12px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid ' + (canSend ? withAlpha(ACCENT, 0.5) : t.hairline),
              background: t.panel,
              color: t.fg,
              outline: 'none',
              opacity: (!selected || busy) ? 0.7 : 1,
            },
          }),
          jsx('button', {
            key: 'send',
            type: 'button',
            onClick: canSend ? onSend : undefined,
            disabled: !canSend,
            style: {
              padding: '0 18px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              cursor: canSend ? 'pointer' : 'not-allowed',
              border: '1px solid ' + (canSend ? ACCENT : t.hairline),
              background: canSend ? withAlpha(ACCENT, 0.22) : t.panel,
              color: t.fg,
              opacity: canSend ? 1 : 0.5,
              whiteSpace: 'nowrap',
            },
            children: busy ? 'Starting…' : 'Send',
          }),
        ],
      }),
    ],
  })
}

/** The page. Header (title + tabs + search + live-only) over a scroll body
 *  (card grid) over a sticky composer. A modal overlay covers the pane when
 *  the user clicks a card. Click card -> modal -> Summon -> composer pill ->
 *  Send. Never starts a session until Send is pressed. */
function ExpertsPage() {
  const [tab, setTab] = useState('experts')
  const [query, setQuery] = useState('')
  const [installedOnly, setInstalledOnly] = useState(false)
  const [, bumpInstalled] = useState(0)
  const [installingId, setInstallingId] = useState(null)
  const [modal, setModal] = useState(null)        // a card row (TEAMS or EXPERTS), or null
  const [selected, setSelected] = useState(null)  // an EXPERTS entry, or null
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const t = theme()
  const isTeam = tab === 'teams'
  const all = isTeam ? TEAMS : EXPERTS

  const q = query.trim().toLowerCase()
  const matched = q ? all.filter((item) => haystack(item, isTeam).toLowerCase().indexOf(q) >= 0) : all
  const teamIdOf = (it) => (isTeam ? it.id : it.teamId)
  const items = installedOnly ? matched.filter((item) => isInstalled(teamIdOf(item))) : matched

  // Install = fetch the team payload once and cache it in localStorage, so the
  // team (and every expert in it) runs with no network afterwards.
  const doInstall = async (teamId) => {
    setInstallingId(teamId)
    try {
      await installTeam(teamId)
      notify('Installed "' + teamId + '" — cached for offline use', 'info')
    } catch (err) {
      notifyError('Install failed: ' + (err && err.message ? err.message : 'unknown'))
    } finally {
      setInstallingId(null)
      bumpInstalled()
    }
  }

  // Card content. EXPERTS rows have name = "Name — Role"; TEAMS rows have a
  // lead sub-object. Match WorkBuddy's card order: role as headline, name
  // below. Tags are the categorical job areas authored in teams.json (NOT
  // the action labels in skills[].label).
  const cards = items.map((item) => {
    let tags = []
    let role = ''
    let name = ''
    if (isTeam) {
      role = item.name
      name = item.lead.name + ' · ' + item.lead.role
      // For a team card, show the lead's tags — they are the team's headline
      // identity. Members' tags surface in the modal.
      tags = (item.lead && item.lead.tags) || []
    } else {
      const parts = (item.name || '').split(' — ')
      name = parts[0] || item.name
      role = parts.slice(1).join(' — ') || item.teamName
      tags = item.tags || []
    }
    const cardTeamId = teamIdOf(item)
    const cardInstalled = isInstalled(cardTeamId)
    return jsx(ExpertCard, {
      key: item.id,
      item: item,
      role: role,
      name: name,
      tags: tags,
      // Teams tab: the TEAMS entry itself carries members. Experts tab: null,
      // so a solo card stays a solo card.
      team: isTeam ? item : null,
      t: t,
      installed: cardInstalled,
      onInstall: cardInstalled ? null : () => doInstall(cardTeamId),
      installing: installingId === cardTeamId,
      onOpen: item.ported ? () => setModal(item) : null,
    })
  })

  let route = ''
  try { route = window.location.hash || '' } catch (e) { /* noop */ }
  const installedCount = all.filter((item) => isInstalled(teamIdOf(item))).length

  let emptyText = 'Nothing here yet.'
  if (q && !matched.length) {
    emptyText = 'No ' + (isTeam ? 'teams' : 'experts') + ' match "' + query.trim() + '".'
  } else if (q && !items.length) {
    emptyText =
      matched.length + (matched.length === 1 ? ' match is' : ' matches are') +
      ' not installed yet — turn off "Installed only" to see ' +
      (matched.length === 1 ? 'it' : 'them') + '.'
  }

  // Import a cache file the user exported earlier (handy: clearing app data
  // wipes localStorage, so a JSON backup restores installed teams).
  const importFromFile = () => {
    try {
      const inp = document.createElement('input')
      inp.type = 'file'
      inp.accept = 'application/json'
      inp.onchange = () => {
        const f = inp.files && inp.files[0]
        if (!f) return
        const r = new FileReader()
        r.onload = () => { importCache(String(r.result)); bumpInstalled() }
        r.readAsText(f)
      }
      inp.click()
    } catch (e) {
      notifyError('Import failed: ' + (e && e.message ? e.message : 'unknown'))
    }
  }

  // Modal always shows the expert/team-lead as an EXPERTS entry so the
  // composer pill and the Summon button use the same shape.
  const modalTarget = modal
    ? (isTeam
        ? EXPERTS.find((e) => e.run && e.run.kind === 'lead' && e.run.team === modal.id)
        : modal)
    : null
  const modalRole = modalTarget
    ? ((modalTarget.name || '').split(' — ').slice(1).join(' — ') || (isTeam ? (modal && modal.name) || '' : ''))
    : ''
  const modalName = modalTarget ? (modalTarget.name.split(' — ')[0] || '') : ''
  // modalTarget is always an EXPERTS entry (teams resolve to their lead), so
  // its `tags` is the categorical job-area list — exactly what the modal
  // shows under "Tags".
  const modalTags = modalTarget ? (modalTarget.tags || []) : []
  // Resolve the roster from the LEAD's team id, not from which tab you opened
  // it — so a lead opened from the Experts tab names its team too.
  const modalTeam = modalTarget && modalTarget.run && modalTarget.run.kind === 'lead'
    ? teamById(modalTarget.run.team)
    : null
  const modalTeamId = (modalTeam && modalTeam.id) || (modalTarget && modalTarget.teamId)
  const modalInstalled = modalTeamId ? isInstalled(modalTeamId) : false

  // Send: prepend the startNote so the persona sees the summoning context
  // regardless of what the user typed. Empty text still works — the expert
  // will introduce itself.
  const startNote = (selected && selected.startNote) || 'summoning team/expert'
  const body = (text.trim() ? startNote + '\n\n' + text.trim() : startNote)

  const send = async () => {
    if (!selected || busy) return
    setBusy(true)
    const label = selected.name
    try {
      if (selected.run && selected.run.kind === 'lead') {
        await runLead(selected.run.team, body)
      } else {
        await runSolo(selected.run.agent, body)
      }
      notify('Started ' + label, 'info')
      setText('')
      bumpInstalled() // a not-yet-installed team is now cached after the on-the-fly download
    } catch (err) {
      notifyError('Could not start ' + label + ': ' + (err && err.message ? err.message : 'unknown error'))
    } finally {
      setBusy(false)
    }
  }

  return jsx('div', {
    style: {
      boxSizing: 'border-box',
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: '320px',
      background: t.bg,
      color: t.fg,
      fontFamily: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    children: [
      // Header: title + tabs + search + live-only toggle.
      jsx('div', {
        key: 'header',
        style: { flex: '0 0 auto', padding: '20px 20px 12px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
        children: [
          jsx('div', {
            key: 'titleRow',
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
            children: [
              jsx('div', {
                key: 'title',
                style: { display: 'flex', alignItems: 'baseline', gap: 10 },
                children: [
                  jsx('h1', { key: 'h1', style: { margin: 0, fontSize: 20, fontWeight: 650 }, children: 'Experts' }),
                  jsx('span', { key: 'count', style: { fontSize: 12, color: t.faint }, children: items.length + ' of ' + all.length + (isTeam ? ' teams' : ' experts') }),
                ],
              }),
              jsx('button', {
                key: 'close',
                type: 'button',
                title: 'Back to chat',
                onClick: () => { tap(); go('/') },
                style: { padding: '6px 14px', fontSize: 13, borderRadius: 7, cursor: 'pointer', border: '1px solid ' + t.hairline, background: t.panel, color: t.fg },
                children: 'Close',
              }),
            ],
          }),
          jsx('div', {
            key: 'controlsRow',
            style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
            children: [
              jsx(TabBar, { key: 'tabs', active: tab, onSelect: setTab, t: t }),
              jsx('div', { key: 'spacer', style: { flex: 1 } }),
              jsx('input', {
                key: 'search',
                type: 'text',
                value: query,
                placeholder: 'Search name, role, or team…',
                onChange: (e) => setQuery(e.target.value),
                onKeyDown: (e) => { if (e.key === 'Escape') setQuery('') },
                style: {
                  flex: '0 1 260px',
                  minWidth: 180,
                  padding: '7px 11px',
                  fontSize: 12,
                  borderRadius: 7,
                  border: '1px solid ' + (q ? ACCENT : t.hairline),
                  background: t.panel,
                  color: t.fg,
                  outline: 'none',
                },
              }),
              jsx('button', {
                key: 'toggle',
                type: 'button',
                onClick: () => setInstalledOnly(!installedOnly),
                style: {
                  padding: '7px 12px',
                  fontSize: 12,
                  borderRadius: 7,
                  cursor: 'pointer',
                  border: '1px solid ' + (installedOnly ? ACCENT : t.hairline),
                  background: installedOnly ? withAlpha(ACCENT, 0.16) : 'transparent',
                  color: t.fg,
                  whiteSpace: 'nowrap',
                },
                children: installedOnly ? 'Installed only (' + installedCount + ')' : 'Show all (' + all.length + ')',
              }),
            ],
          }),
        ],
      }),

      // Scroll body: the grid of cards.
      jsx('div', {
        key: 'body',
        style: { flex: 1, overflowY: 'auto', padding: '8px 20px 16px 20px', minHeight: 0 },
        children: items.length
          ? jsx('div', {
              style: {
                display: 'grid',
                gap: 12,
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                alignItems: 'stretch',
              },
              children: cards,
            })
          : jsx('div', { style: { fontSize: 13, color: t.muted, paddingTop: 20 }, children: emptyText }),
      }),

      // Composer (bottom).
      jsx(Composer, {
        key: 'composer',
        selected: selected,
        text: text,
        busy: busy,
        t: t,
        onText: setText,
        onClear: () => { setSelected(null); publishSelection(null); setText('') },
        onSend: send,
      }),

      // Modal overlay (absolute, covers the pane; the earlier build used
      // position:fixed and covered the titlebar — keep it contained).
      modal && modalTarget
        ? jsx(ExpertModal, {
            key: 'modal',
            expert: modalTarget,
            role: modalRole,
            name: modalName,
            tags: modalTags,
            team: modalTeam,
            installed: modalInstalled,
            t: t,
            onClose: () => setModal(null),
            onSummon: () => { setSelected(modalTarget); publishSelection(modalTarget); setModal(null); setText('') },
          })
        : null,

      // Footer (build id + status).
      jsx('div', {
        key: 'foot',
        style: {
          flex: '0 0 auto',
          padding: '6px 16px 8px 16px',
          fontSize: 10.5,
          color: t.faint,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          borderTop: '1px solid ' + withAlpha(t.fg, 0.08),
        },
        children: [
          jsx('span', { key: 'build', children: 'experts build ' + BUILD }),
          jsx('span', { key: 'route', children: 'route ' + (route || '(none)') }),
          jsx('span', { key: 'src', children: 'agency-agents MIT · ' + TOTAL_AGENTS + ' agents' }),
          jsx('span', { key: 'installed', children: installedCount + ' installed' }),
          jsx('span', { key: 'state', children: busy ? 'starting...' : (selected ? 'ready · ' + selected.name : 'ready') }),
          jsx('span', { key: 'spacer2', style: { flex: 1 } }),
          jsx('button', {
            key: 'export',
            type: 'button',
            title: 'Export your installed cache as a JSON file',
            onClick: () => exportCache(),
            style: { background: 'transparent', border: '1px solid ' + t.hairline, color: t.muted, borderRadius: 6, padding: '2px 8px', fontSize: 10.5, cursor: 'pointer' },
            children: 'Export',
          }),
          jsx('button', {
            key: 'import',
            type: 'button',
            title: 'Import an installed cache from a JSON file',
            onClick: () => importFromFile(),
            style: { background: 'transparent', border: '1px solid ' + t.hairline, color: t.muted, borderRadius: 6, padding: '2px 8px', fontSize: 10.5, cursor: 'pointer' },
            children: 'Import',
          }),
        ],
      }),
    ],
  })
}
/** Status bar shortcut. Reads the active selection via the pub-sub and
 *  shows the current expert as a chip next to the static "experts" label,
 *  so the user can see at a glance which expert is loaded even when the
 *  Experts page is not in view. Click anywhere on the chip -> open the
 *  page (which is also where the composer pill lives). */
function ActiveExpertChip() {
  const [, force] = useState(0)
  useEffect(() => subscribeSelection(() => force((n) => n + 1)), [])

  const sel = readSelection()
  const t = theme()
  const active = !!(sel && sel.ported !== false)
  const nameOnly = sel ? (sel.name || '').split(' — ')[0] : ''

  return jsx('button', {
    type: 'button',
    title: active
      ? 'Active expert: ' + nameOnly + ' — open Experts'
      : 'Open Experts (build ' + BUILD + ')',
    onClick: () => { tap(); go(PAGE) },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: '100%',
      padding: active ? '0 8px' : '0 6px',
      fontSize: 11,
      background: active ? withAlpha(ACCENT, 0.14) : 'transparent',
      border: 'none',
      color: active ? t.fg : 'inherit',
      opacity: active ? 1 : 0.7,
      cursor: 'pointer',
    },
    children: active
      ? [
          jsx('span', { key: 'lbl', style: { opacity: 0.55 }, children: 'experts' }),
          jsx('span', { key: 'dot', style: { opacity: 0.4 }, children: '·' }),
          jsx(Avatar, {
            key: 'av',
            letter: sel.avatar.letter,
            tone: sel.avatar.tone,
            t: t,
          }),
          jsx('span', { key: 'nm', style: { fontWeight: 600 }, children: nameOnly }),
        ]
      : 'experts',
  })
}

// A palette shortcut straight into a lead run, for every ported team.
function teamCommands() {
  return TEAMS.filter((team) => team.ported).map((team) => ({
    id: 'shortcut-' + team.id,
    area: PALETTE_AREA,
    data: {
      id: 'experts.run.' + team.id,
      label: 'Experts: Start a ' + team.name + ' run',
      keywords: [team.name.toLowerCase(), 'team', 'run'].concat(team.id.split('-')),
      run: () => {
        runLead(team.id, INTRO_TASK).then(
          () => notify(team.name + ' team started', 'info'),
          (err) => notifyError('Could not start: ' + (err && err.message ? err.message : 'unknown'))
        )
      },
    },
  }))
}

export default {
  id: ID, // must match the folder name
  name: 'Experts',
  defaultEnabled: true, // visible without a Settings > Plugins toggle hunt

  register(ctx) {
    ctx.registerMany(
      [
        // Nav row in the top-left rail (routes.ts SIDEBAR_NAV_AREA).
        {
          id: 'nav',
          area: SIDEBAR_NAV_AREA,
          order: 60,
          data: { path: PAGE, label: 'Experts', codicon: 'person' },
        },

        // The page the row opens. Wrapped in Boundary so a throw is visible.
        {
          id: 'page',
          area: ROUTES_AREA,
          data: { path: PAGE },
          render: () => jsx(Boundary, { children: jsx(ExpertsPage, {}) }),
        },

        // Status bar shortcut — diagnostic step 1.
        {
          id: 'chip',
          area: STATUSBAR_AREAS.right,
          order: 130,
          render: () => jsx(ActiveExpertChip, {}),
        },

        // Reachable even when the rail is collapsed: Cmd/Ctrl+K.
        {
          id: 'open',
          area: PALETTE_AREA,
          data: {
            id: 'experts.open',
            label: 'Open Experts',
            keywords: ['expert', 'experts', 'team', 'teams', 'research'],
            run: () => go(PAGE),
          },
        },

        // Diagnostic step 2: a toast with no rendering involved at all.
        {
          id: 'ping',
          area: PALETTE_AREA,
          data: {
            id: 'experts.ping',
            label: 'Experts: Ping (prove the plugin is loaded)',
            keywords: ['experts', 'ping', 'diagnostic', 'debug', 'loaded'],
            run: () => notify('Experts plugin is loaded and registered - build ' + BUILD, 'info'),
          },
        },
      ].concat(teamCommands())
    )
  },
}
