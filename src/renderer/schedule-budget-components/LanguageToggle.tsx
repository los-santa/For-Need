import { Globe } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../schedule-budget-contexts/LanguageContext';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ko' ? 'en' : 'ko');
  };

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="icon"
      className="bg-[#4A4A4A] border-white/40 hover:bg-[#6A6A6A] text-white shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
      title={language === 'ko' ? '한국어' : 'English'}
    >
      <Globe className="w-5 h-5" />
      <span className="sr-only">Toggle language</span>
    </Button>
  );
}
