import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Juridico ADV",
        short_name: "Juridico ADV",
        description: "Plataforma juridica com processos, prazos, CRM, financeiro e operacao nacional em modo instalavel.",
        start_url: "/dashboard",
        display: "standalone",
        background_color: "#f3efe9",
        theme_color: "#8d5f43",
        lang: "pt-BR",
        orientation: "portrait",
        icons: [
            {
                src: "/images/logoadv.png?v=3",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/images/logoadv.png?v=3",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
