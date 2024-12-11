import localFont from "next/font/local";
import Image from 'next/image';
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Metadados da página
export const metadata = {
  title: "Meu mercado",
  description: "Seu app de gerenciamento de orçamento pessoal",
};

export default function RootLayout({ children }) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased max-h-screen flex flex-col`}
        >
          <header>
            <nav className="bg-blue-600 border-gray-200 px-4 lg:px-6 py-2.5">
              <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl">
                <Link href="/" className="flex items-center">
                  <span className="self-center text-xl font-semibold whitespace-nowrap text-white">
                    <Image src="/logo_branco.png" alt="Logo do Meu Mercado" width={50} height={50} className="mx-auto mt-4" />
                  </span>
                </Link>
                <div className="flex gap-4 mt-4 lg:mt-0 items-center">
                  <Link href="/" className="text-white hover:text-gray-200 font-medium transition">Dashboard</Link>
                  <Link href="/gastos" className="text-white hover:text-gray-200 font-medium transition">Gastos</Link>
                  <Link href="/rendas" className="text-white hover:text-gray-200 font-medium transition">Rendas</Link>
                  <Link href="/configuracoes" className="text-white hover:text-gray-200 font-medium transition">Configurações</Link>
                </div>
              </div>
            </nav>
          </header>
          <main className="bg-gray-100 text-gray-800">{children}</main>
        </body>
      </html>
    </>
  );
}