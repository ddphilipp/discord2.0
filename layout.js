import './globals.css';
export const metadata = { title: 'GameHub', description: 'Freunde, Rooms und Chats zum Zocken' };
export default function Layout({ children }) {
  return <html lang="de"><body>{children}</body></html>;
}
