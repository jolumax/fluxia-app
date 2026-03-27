import React from "react";

export function Skeleton({ className, style, width, height, circle }) {
    return (
        <div 
            className={`skeleton ${className || ""}`} 
            style={{ 
                width: width || "100%", 
                height: height || "20px", 
                borderRadius: circle ? "50%" : "8px",
                ...style 
            }} 
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                <Skeleton circle width={32} height={32} />
                <div style={{ flex: 1 }}>
                    <Skeleton width="60%" height={12} style={{ marginBottom: 6 }} />
                    <Skeleton width="40%" height={10} />
                </div>
            </div>
            <Skeleton height={24} style={{ marginBottom: 12 }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Skeleton width="30%" height={10} />
                <Skeleton width="20%" height={10} />
            </div>
        </div>
    );
}
