import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { CompanyProfile } from '../types';
import { DEFAULT_COMPANY_PROFILE } from '../utils/companyDefaults';
import { toast } from 'sonner';
import {
  Building2,
  MapPin,
  Phone,
  MessageSquare,
  Mail,
  Clock,
  Globe,
  Save,
  ExternalLink,
  Facebook,
  Instagram,
  Map as MapIcon
} from 'lucide-react';
import { motion } from 'motion/react';

// Uses the same fallback data shown on the public site before a profile
// exists in Firestore, so the very first record ever saved already matches
// what visitors are seeing (see src/utils/companyDefaults.ts).
const INITIAL_PROFILE: CompanyProfile = {
  ...DEFAULT_COMPANY_PROFILE,
  whatsapp: DEFAULT_COMPANY_PROFILE.phone,
  updatedAt: new Date().toISOString(),
};

export default function CompanyProfileDashboard() {
  const [profile, setProfile] = useState<CompanyProfile>(INITIAL_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'companyProfile', 'config');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as CompanyProfile);
        } else {
          // Initialize with default data if not exists
          await setDoc(docRef, INITIAL_PROFILE);
          setProfile(INITIAL_PROFILE);
        }
      } catch (error) {
        console.error("Error fetching company profile:", error);
        toast.error("Failed to load company profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'companyProfile', 'config');
      const updatedProfile = {
        ...profile,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(docRef, updatedProfile as any);
      toast.success("Company profile updated successfully");
    } catch (error) {
      console.error("Error updating company profile:", error);
      toast.error("Failed to update company profile");
    } finally {
      setSaving(false);
    }
  };

  const updateHours = (day: keyof CompanyProfile['openingHours'], value: string) => {
    setProfile(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: value
      }
    }));
  };

  const updateSocial = (platform: keyof CompanyProfile['socialLinks'], value: string) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-ink">Company Profile</h1>
          <p className="text-gray-500 mt-1">Manage your business information and contact details.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-navy text-white rounded-xl hover:bg-gold transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
          ) : (
            <Save size={20} />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center text-navy">
              <Building2 size={24} />
            </div>
            <h2 className="text-xl font-bold text-ink">Basic Information</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile({...profile, name: e.target.value})}
                className="w-full px-4 py-3 bg-cream border-none rounded-2xl focus:ring-2 focus:ring-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Physical Address</label>
              <textarea
                value={profile.address}
                onChange={e => setProfile({...profile, address: e.target.value})}
                rows={3}
                className="w-full px-4 py-3 bg-cream border-none rounded-2xl focus:ring-2 focus:ring-gold outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Description / Bio</label>
              <textarea
                value={profile.description}
                onChange={e => setProfile({...profile, description: e.target.value})}
                rows={4}
                className="w-full px-4 py-3 bg-cream border-none rounded-2xl focus:ring-2 focus:ring-gold outline-none resize-none"
              />
            </div>
          </div>
        </motion.div>

        {/* Contact Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center text-navy">
              <Phone size={24} />
            </div>
            <h2 className="text-xl font-bold text-ink">Contact Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <div className="flex items-center gap-3 bg-cream px-4 py-3 rounded-2xl focus-within:ring-2 focus-within:ring-gold">
                <Phone size={18} className="text-gray-400" />
                <input
                  type="text"
                  value={profile.phone}
                  onChange={e => setProfile({...profile, phone: e.target.value})}
                  className="bg-transparent border-none outline-none w-full text-ink"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp</label>
              <div className="flex items-center gap-3 bg-cream px-4 py-3 rounded-2xl focus-within:ring-2 focus-within:ring-gold">
                <MessageSquare size={18} className="text-gray-400" />
                <input
                  type="text"
                  value={profile.whatsapp}
                  onChange={e => setProfile({...profile, whatsapp: e.target.value})}
                  className="bg-transparent border-none outline-none w-full text-ink"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Line ID</label>
              <div className="flex items-center gap-3 bg-cream px-4 py-3 rounded-2xl focus-within:ring-2 focus-within:ring-gold">
                <Globe size={18} className="text-gray-400" />
                <input
                  type="text"
                  value={profile.lineId}
                  onChange={e => setProfile({...profile, lineId: e.target.value})}
                  className="bg-transparent border-none outline-none w-full text-ink"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <div className="flex items-center gap-3 bg-cream px-4 py-3 rounded-2xl focus-within:ring-2 focus-within:ring-gold">
                <Mail size={18} className="text-gray-400" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={e => setProfile({...profile, email: e.target.value})}
                  className="bg-transparent border-none outline-none w-full text-ink"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Location & Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center text-navy">
              <MapIcon size={24} />
            </div>
            <h2 className="text-xl font-bold text-ink">Location & Map</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Google Place ID</label>
                <div className="flex items-center gap-3 bg-cream px-4 py-3 rounded-2xl focus-within:ring-2 focus-within:ring-gold">
                  <MapPin size={18} className="text-gray-400" />
                  <input
                    type="text"
                    value={profile.googlePlaceId}
                    onChange={e => setProfile({...profile, googlePlaceId: e.target.value})}
                    className="bg-transparent border-none outline-none w-full text-ink"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Used for reviews and place details fetching.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Map Embed URL (src only)</label>
                <div className="flex items-center gap-3 bg-cream px-4 py-3 rounded-2xl focus-within:ring-2 focus-within:ring-gold">
                  <ExternalLink size={18} className="text-gray-400" />
                  <input
                    type="text"
                    value={profile.mapEmbedUrl}
                    onChange={e => setProfile({...profile, mapEmbedUrl: e.target.value})}
                    placeholder="https://www.google.com/maps/embed/v1/place?..."
                    className="bg-transparent border-none outline-none w-full text-ink"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">The 'src' attribute from Google Maps iframe embed code.</p>
              </div>
            </div>

            <div className="bg-cream rounded-[32px] p-6 border border-gray-100">
               <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
                 <MapIcon size={16} /> Map Preview
               </h3>
               {profile.mapEmbedUrl ? (
                 <iframe
                   src={profile.mapEmbedUrl}
                   className="w-full h-48 rounded-2xl border-none shadow-sm"
                   loading="lazy"
                 ></iframe>
               ) : (
                 <div className="h-48 rounded-2xl bg-white/50 flex items-center justify-center border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 italic text-sm text-center px-6">
                      Enter a map embed URL to see the preview here.
                    </p>
                 </div>
               )}
            </div>
          </div>
        </motion.div>

        {/* Opening Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center text-navy">
              <Clock size={24} />
            </div>
            <h2 className="text-xl font-bold text-ink">Opening Hours</h2>
          </div>

          <div className="space-y-4">
            {Object.keys(profile.openingHours).map((day) => (
              <div key={day} className="flex items-center gap-4">
                <label className="w-32 text-sm font-bold text-gray-700 capitalize">{day}</label>
                <input
                  type="text"
                  value={profile.openingHours[day as keyof CompanyProfile['openingHours']]}
                  onChange={e => updateHours(day as keyof CompanyProfile['openingHours'], e.target.value)}
                  className="flex-1 px-4 py-2 bg-cream border-none rounded-xl focus:ring-2 focus:ring-gold outline-none text-sm"
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Social Media Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center text-navy">
              <Globe size={24} />
            </div>
            <h2 className="text-xl font-bold text-ink">Social Media Links</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Facebook URL</label>
              <div className="flex items-center gap-3 bg-cream px-4 py-3 rounded-2xl focus-within:ring-2 focus-within:ring-gold">
                <Facebook size={18} className="text-blue-600" />
                <input
                  type="text"
                  value={profile.socialLinks.facebook}
                  onChange={e => updateSocial('facebook', e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-ink text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Instagram URL</label>
              <div className="flex items-center gap-3 bg-cream px-4 py-3 rounded-2xl focus-within:ring-2 focus-within:ring-gold">
                <Instagram size={18} className="text-pink-600" />
                <input
                  type="text"
                  value={profile.socialLinks.instagram}
                  onChange={e => updateSocial('instagram', e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-ink text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">TripAdvisor URL</label>
              <div className="flex items-center gap-3 bg-cream px-4 py-3 rounded-2xl focus-within:ring-2 focus-within:ring-gold">
                <Globe size={18} className="text-green-600" />
                <input
                  type="text"
                  value={profile.socialLinks.tripAdvisor}
                  onChange={e => updateSocial('tripAdvisor', e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-ink text-sm"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
