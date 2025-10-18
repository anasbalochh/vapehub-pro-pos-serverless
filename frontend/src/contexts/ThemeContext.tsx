import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>('light');
    const [isLoading, setIsLoading] = useState(true);

    // Get current user from Supabase Auth
    const getCurrentUser = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (!session || !session.user) {
                return null;
            }

            // Get user details from our users table
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, username, role')
                .eq('id', session.user.id)
                .single();

            if (userError || !userData) {
                return null;
            }

            return userData;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    };

    // Load theme from Supabase
    const loadTheme = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) {
                // No user logged in, use system preference
                const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                setTheme(systemTheme);
                setIsLoading(false);
                return;
            }

            // Get user theme from Supabase
            const { data, error } = await supabase
                .from('users')
                .select('theme_preference')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading theme:', error);
                // Fallback to system preference
                const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                setTheme(systemTheme);
            } else {
                // Use saved theme or default to system preference
                const savedTheme = data?.theme_preference as Theme;
                if (savedTheme) {
                    setTheme(savedTheme);
                } else {
                    const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    setTheme(systemTheme);
                }
            }
        } catch (error) {
            console.error('Error loading theme:', error);
            // Fallback to system preference
            const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            setTheme(systemTheme);
        } finally {
            setIsLoading(false);
        }
    };

    // Save theme to Supabase
    const saveTheme = async (newTheme: Theme) => {
        try {
            const user = await getCurrentUser();
            if (!user) {
                // No user logged in, theme will be lost on page refresh
                // This is intentional - themes are user-specific
                console.log('No user logged in, theme preference not saved');
                return;
            }

            // Update theme in Supabase
            const { error } = await supabase
                .from('users')
                .update({ theme_preference: newTheme })
                .eq('id', user.id);

            if (error) {
                console.error('Error saving theme:', error);
                // No fallback - theme will be lost on page refresh
                // This ensures we're fully Supabase-dependent
            }
        } catch (error) {
            console.error('Error saving theme:', error);
            // No fallback - theme will be lost on page refresh
            // This ensures we're fully Supabase-dependent
        }
    };

    useEffect(() => {
        loadTheme();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            // Apply theme to document
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(theme);

            // Save theme to Supabase
            saveTheme(theme);
        }
    }, [theme, isLoading]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isLoading }}>
            {children}
        </ThemeContext.Provider>
    );
};
