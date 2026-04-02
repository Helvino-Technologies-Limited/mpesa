import './globals.css';
import { Inter } from 'next/font/google';
import NavigationWrapper from '@/components/NavigationWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'M-Pesa POS | Payment System',
  description: 'M-Pesa STK Push payment system for Point of Sale',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavigationWrapper />
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
