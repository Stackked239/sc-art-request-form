import type { Metadata } from 'next';
import { Passion_One, Noto_Sans } from 'next/font/google';
import './globals.css';

const passionOne = Passion_One({
  weight: '700',
  subsets: ['latin'],
  variable: '--font-passion-one',
});

const notoSans = Noto_Sans({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-noto-sans',
});

export const metadata: Metadata = {
  title: 'Art Request Form | Sunday Cool',
  description: 'Submit your custom art request to Sunday Cool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${passionOne.variable} ${notoSans.variable} font-body`}>
        {children}
      </body>
    </html>
  );
}
