import type { Law } from "@/lib/types";

export const pipl: Law = {
  id: "pipl",
  jurisdictionId: "cn",
  name: "Personal Information Protection Law of the People's Republic of China (PIPL)",
  shortName: "PIPL",
  domain: "privacy",
  status: "in-force",
  effectiveDate: "2021-11",
  authority: "Cyberspace Administration of China (CAC)",
  officialUrl: "http://www.npc.gov.cn/npc/c2/c30834/202108/t20210820_313088.html",
  summary:
    "The PIPL is China's comprehensive personal-information law, effective November 2021, sitting alongside the Cybersecurity Law and Data Security Law. Structurally similar to the GDPR but with distinctly stricter cross-border-transfer controls and data-localization obligations, frequent 'separate consent' requirements, and penalties of up to RMB 50 million or 5% of prior-year turnover.",
  mappings: {
    "lawful-basis": {
      strictness: 3,
      obligation:
        "Processing requires one of the enumerated bases (consent, contract necessity, legal duty, public-health/emergency, public-interest news, etc.).",
      citation: "PIPL Art. 13",
      quote:
        "符合下列情形之一的，个人信息处理者方可处理个人信息",
    },
    consent: {
      strictness: 3,
      obligation:
        "Consent must be voluntary and informed; 'separate consent' is required for sensitive data, third-party provision, public disclosure, and cross-border transfer.",
      citation: "PIPL Arts. 14, 25, 29, 39",
      quote:
        "该同意应当由个人在充分知情的前提下自愿、明确作出",
    },
    "notice-transparency": {
      strictness: 3,
      obligation: "Detailed pre-processing notice of identity, purposes, methods, categories, and retention required.",
      citation: "PIPL Art. 17",
      quote:
        "应当以显著方式、清晰易懂的语言真实、准确、完整地向个人告知下列事项",
    },
    "rights-access": {
      strictness: 2,
      obligation: "Individuals may access and copy their personal information from handlers.",
      citation: "PIPL Art. 45",
      quote:
        "个人有权向个人信息处理者查阅、复制其个人信息",
    },
    "rights-deletion": {
      strictness: 2,
      obligation: "Right to deletion in enumerated circumstances (purpose fulfilled, consent withdrawn, etc.).",
      citation: "PIPL Art. 47",
      quote:
        "个人信息处理者应当主动删除个人信息；个人信息处理者未删除的，个人有权请求删除",
    },
    "rights-correction": {
      strictness: 2,
      obligation: "Right to request correction or completion of inaccurate personal information.",
      citation: "PIPL Art. 46",
      quote:
        "个人发现其个人信息不准确或者不完整的，有权请求个人信息处理者更正、补充",
    },
    "rights-portability": {
      strictness: 2,
      obligation: "Right to have personal information transferred to a designated handler where CAC conditions are met.",
      citation: "PIPL Art. 45 para.3",
      quote:
        "个人请求将个人信息转移至其指定的个人信息处理者，符合国家网信部门规定条件的，个人信息处理者应当提供转移的途径",
    },
    "rights-optout-sale": {
      strictness: 2,
      obligation:
        "For automated marketing/push, individuals must be offered a non-targeted option or an easy way to refuse.",
      citation: "PIPL Art. 24",
      quote:
        "应当同时提供不针对其个人特征的选项，或者向个人提供便捷的拒绝方式",
    },
    "rights-automated-decision": {
      strictness: 3,
      obligation:
        "Automated decision-making must be transparent and fair; individuals may demand an explanation and refuse decisions made solely by automation.",
      citation: "PIPL Art. 24",
      quote:
        "有权拒绝个人信息处理者仅通过自动化决策的方式作出决定",
    },
    "sensitive-data": {
      strictness: 3,
      obligation:
        "Sensitive PI needs a specific purpose, necessity, strict protection, separate consent, and a prior impact assessment.",
      citation: "PIPL Arts. 28–32",
      quote:
        "处理敏感个人信息应当取得个人的单独同意",
    },
    "childrens-data": {
      strictness: 3,
      obligation:
        "Data of minors under 14 is sensitive; parental consent and a dedicated processing rule are required.",
      citation: "PIPL Art. 31",
      quote:
        "处理不满十四周岁未成年人个人信息的，应当取得未成年人的父母或者其他监护人的同意",
    },
    "breach-notification": {
      strictness: 2,
      obligation:
        "On a breach, take remedial measures and notify the authorities and affected individuals (subject to a harm-based exception).",
      citation: "PIPL Art. 57",
      quote:
        "应当立即采取补救措施，并通知履行个人信息保护职责的部门和个人",
    },
    "dpo-representative": {
      strictness: 2,
      obligation:
        "Handlers over a CAC threshold must appoint a person in charge; overseas handlers must establish a domestic representative.",
      citation: "PIPL Arts. 52, 53",
      quote:
        "应当指定个人信息保护负责人",
    },
    dpia: {
      strictness: 3,
      obligation:
        "A personal-information protection impact assessment is mandatory for sensitive data, automated decisions, sharing, and cross-border transfers.",
      citation: "PIPL Arts. 55–56",
      quote:
        "个人信息处理者应当事前进行个人信息保护影响评估，并对处理情况进行记录",
    },
    "cross-border-transfer": {
      strictness: 3,
      obligation:
        "Transfers require a CAC security assessment, certification, or the CAC standard contract, plus separate consent — among the strictest regimes globally.",
      citation: "PIPL Arts. 38–40",
      quote:
        "确需向中华人民共和国境外提供个人信息的，应当具备下列条件之一",
    },
    "data-localization": {
      strictness: 3,
      obligation:
        "Critical information infrastructure operators and high-volume handlers must store personal information within China.",
      citation: "PIPL Art. 40",
      quote:
        "应当将在中华人民共和国境内收集和产生的个人信息存储在境内",
    },
    "records-processing": {
      strictness: 2,
      obligation: "Compliance audits are required and records must be kept; large platforms face added governance duties.",
      citation: "PIPL Arts. 54, 58",
      quote:
        "应当定期对其处理个人信息遵守法律、行政法规的情况进行合规审计",
    },
    "vendor-processor": {
      strictness: 2,
      obligation: "Entrusted processing must be governed by a contract, with oversight of the entrusted party.",
      citation: "PIPL Art. 21",
      quote:
        "个人信息处理者委托处理个人信息的，应当与受托人约定委托处理的目的、期限、处理方式",
    },
    security: {
      strictness: 2,
      obligation: "Security measures (encryption, de-identification, access control) required, layered on CSL/MLPS duties.",
      citation: "PIPL Art. 51",
      quote:
        "采取相应的加密、去标识化等安全技术措施",
    },
    "enforcement-penalties": {
      strictness: 3,
      obligation:
        "For serious violations: fines up to RMB 50 million or 5% of prior-year turnover, business suspension, and personal liability for responsible staff.",
      citation: "PIPL Art. 66",
      quote:
        "并处五千万元以下或者上一年度营业额百分之五以下罚款",
    },
  },
};
