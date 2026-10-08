import { EditorPage } from '@/components/EditorPage';
import { Footer } from '@/components/Footer';

export default function App() {
  return (
    <div className="min-h-screen">
      <div className="h-screen flex flex-col">
        <main className="flex-1 min-h-0 overflow-hidden">
          <EditorPage />
        </main>
        <Footer />
      </div>
    </div>
  );
}
