import { EditorPage } from '@/components/EditorPage';
import { Footer } from '@/components/Footer';

export default function App() {
  return (
    <div className="min-h-screen">
      <div className="h-screen flex flex-col">
        {/* Clipped, not hidden: a hidden overflow still scrolls, so focusing
        a control would slide the page sideways by a navbar tooltip's width. */}
        <main className="flex-1 min-h-0 overflow-clip">
          <EditorPage />
        </main>
        <Footer />
      </div>
    </div>
  );
}
