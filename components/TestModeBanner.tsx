interface Props { name: string; role: string }

const ROLE_LABELS: Record<string, string> = {
  super_admin:  "Super Admin",
  admin:        "Administrator",
  dean:         "Dean",
  coordinator:  "Coordinator",
  counselor:    "Counselor",
  teacher:      "Teacher",
  staff:        "Faculty / Staff",
}

export default function TestModeBanner({ name, role }: Props) {
  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 text-center"
      style={{ background: "#FFF8E0", borderBottom: "1px solid #F0C040" }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: "#6B4C00" }}>
        🔧 Test Mode &mdash; {name} &mdash; {ROLE_LABELS[role] ?? role}
      </span>
    </div>
  )
}
