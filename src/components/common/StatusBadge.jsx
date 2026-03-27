import React from "react";

export function StatusBadge({ status }) {
    if (status === "valido") return <span className="badge badge-success">✓ Válido DGII</span>;
    if (status === "error") return <span className="badge badge-danger">✕ NCF Inválido</span>;
    if (status === "revision") return <span className="badge badge-warning">⚠ En Revisión</span>;
    if (status === "duplicado") return <span className="badge badge-neutral">⊘ Duplicado</span>;
    return null;
}
