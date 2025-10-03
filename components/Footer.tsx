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
        <footer className="bg-slate-900 border-t border-slate-700/50 mt-16 py-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
                <img
                    src="https://affiliatemarketingforsuccess.com/wp-content/uploads/2023/03/cropped-Affiliate-Marketing-for-Success-Logo-Edited.png?lm=6666FEE0"
                    alt="Affiliate Marketing for Success Logo"
                    className="h-16 w-auto mx-auto mb-4"
                />
                <p className="text-sm">
                    This App is Created by Alexios Papaioannou, Owner of <a href="https://affiliatemarketingforsuccess.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-300 hover:text-indigo-400 transition-colors">affiliatemarketingforsuccess.com</a>
                </p>
                <div className="mt-6">
                    <p className="text-base font-semibold text-slate-200 mb-3">Learn more about</p>
                    <nav className="flex justify-center items-center flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
                        {footerLinks.map((link) => (
                            <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 hover:text-indigo-400 hover:underline transition-colors">
                                {link.name}
                            </a>
                        ))}
                    </nav>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
