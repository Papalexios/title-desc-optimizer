
import React from 'react';

const Footer: React.FC = () => {
    const footerLinks = [
        { name: 'Affiliate Marketing', href: 'https://affiliatemarketingforsuccess.com/affiliate-marketing' },
        { name: 'AI', href: 'https://affiliatemarketingforsuccess.com/ai' },
        { name: 'SEO', href: 'https://affiliatemarketingforsuccess.com/seo' },
        { name: 'Blogging', href: 'https://affiliatemarketingforsuccess.com/blogging' },
        { name: 'Reviews', href: 'https://affiliatemarketingforsuccess.com/review' },
    ];

    return (
        <footer className="relative mt-20 border-t border-white/5 bg-slate-900/80 backdrop-blur-2xl">
            {/* Artistic Glow Top Border */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-70"></div>
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="flex flex-col items-center text-center space-y-8">
                    
                    {/* Logo */}
                    <div className="relative group">
                         <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-700"></div>
                        <img
                            src="https://affiliatemarketingforsuccess.com/wp-content/uploads/2023/03/cropped-Affiliate-Marketing-for-Success-Logo-Edited.png?lm=6666FEE0"
                            alt="Affiliate Marketing for Success Logo"
                            className="h-20 sm:h-24 w-auto relative z-10 transition-transform duration-300 hover:scale-105 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        />
                    </div>

                    {/* Creator Credits */}
                    <div className="max-w-xl mx-auto space-y-2">
                        <p className="text-sm sm:text-base text-slate-400 font-light">
                            This App is Created by <span className="text-white font-semibold">Alexios Papaioannou</span>
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 uppercase tracking-widest">
                            Owner of <a href="https://affiliatemarketingforsuccess.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors border-b border-indigo-500/30 hover:border-indigo-400">affiliatemarketingforsuccess.com</a>
                        </p>
                    </div>

                    {/* SOTA Navigation */}
                    <div className="w-full max-w-4xl mx-auto pt-8">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-600"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Learn More About</span>
                            <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-600"></div>
                        </div>
                        
                        <nav className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4" aria-label="Footer Navigation">
                            {footerLinks.map((link, index) => (
                                <React.Fragment key={link.name}>
                                    <a 
                                        href={link.href} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="group relative px-2 py-1"
                                    >
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors relative z-10">{link.name}</span>
                                        <span className="absolute inset-x-0 bottom-0 h-px bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
                                    </a>
                                    {index < footerLinks.length - 1 && (
                                        <span className="text-slate-700 hidden sm:inline">•</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </nav>
                    </div>

                    <div className="pt-8 text-[10px] text-slate-600 font-mono">
                        © {new Date().getFullYear()} SERPQUANTUM AI. ALL RIGHTS RESERVED.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
