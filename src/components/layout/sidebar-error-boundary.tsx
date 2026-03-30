"use client";

import { Component, type ReactNode } from "react";

type SidebarErrorBoundaryProps = {
    children: ReactNode;
    fallback: ReactNode;
    resetKey?: string;
};

type SidebarErrorBoundaryState = {
    hasError: boolean;
};

export class SidebarErrorBoundary extends Component<SidebarErrorBoundaryProps, SidebarErrorBoundaryState> {
    constructor(props: SidebarErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        console.error("[sidebar] client render failed", error);
    }

    componentDidUpdate(prevProps: SidebarErrorBoundaryProps) {
        if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }

        return this.props.children;
    }
}
