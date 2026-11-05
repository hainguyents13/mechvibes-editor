import { EditorPage } from '@/components/EditorPage';

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-mv-page font-body text-mv-text">
      {/* Clipped, not hidden: a hidden overflow still scrolls, so focusing
      a control would slide the page sideways by a navbar tooltip's width. */}
      <main className="flex-1 min-h-0 overflow-clip">
        <EditorPage />
      </main>
    </div>
  );
}
