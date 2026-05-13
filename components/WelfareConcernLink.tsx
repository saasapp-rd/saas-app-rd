import Link from "next/link"

export default function WelfareConcernLink() {
  return (
    <div className="pt-3 border-t" style={{ borderColor: "#F0F0F0" }}>
      <Link href="/staff/concern"
            className="flex items-center gap-2 text-xs"
            style={{ color: "#999", textDecoration: "none" }}>
        <span>&#x26A0;</span>
        Report a welfare concern
      </Link>
    </div>
  )
}
