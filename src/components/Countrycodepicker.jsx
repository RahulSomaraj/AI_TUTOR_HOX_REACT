import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export const COUNTRIES = [
  { code: "AF", name: "Afghanistan",                      dial: "+93",  flag: "🇦🇫" },
  { code: "AL", name: "Albania",                          dial: "+355", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria",                          dial: "+213", flag: "🇩🇿" },
  { code: "AD", name: "Andorra",                          dial: "+376", flag: "🇦🇩" },
  { code: "AO", name: "Angola",                           dial: "+244", flag: "🇦🇴" },
  { code: "AG", name: "Antigua and Barbuda",              dial: "+1268",flag: "🇦🇬" },
  { code: "AR", name: "Argentina",                        dial: "+54",  flag: "🇦🇷" },
  { code: "AM", name: "Armenia",                          dial: "+374", flag: "🇦🇲" },
  { code: "AU", name: "Australia",                        dial: "+61",  flag: "🇦🇺" },
  { code: "AT", name: "Austria",                          dial: "+43",  flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan",                       dial: "+994", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas",                          dial: "+1242",flag: "🇧🇸" },
  { code: "BH", name: "Bahrain",                          dial: "+973", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh",                       dial: "+880", flag: "🇧🇩" },
  { code: "BB", name: "Barbados",                         dial: "+1246",flag: "🇧🇧" },
  { code: "BY", name: "Belarus",                          dial: "+375", flag: "🇧🇾" },
  { code: "BE", name: "Belgium",                          dial: "+32",  flag: "🇧🇪" },
  { code: "BZ", name: "Belize",                           dial: "+501", flag: "🇧🇿" },
  { code: "BJ", name: "Benin",                            dial: "+229", flag: "🇧🇯" },
  { code: "BT", name: "Bhutan",                           dial: "+975", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia",                          dial: "+591", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina",           dial: "+387", flag: "🇧🇦" },
  { code: "BW", name: "Botswana",                         dial: "+267", flag: "🇧🇼" },
  { code: "BR", name: "Brazil",                           dial: "+55",  flag: "🇧🇷" },
  { code: "BN", name: "Brunei",                           dial: "+673", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria",                         dial: "+359", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso",                     dial: "+226", flag: "🇧🇫" },
  { code: "BI", name: "Burundi",                          dial: "+257", flag: "🇧🇮" },
  { code: "CV", name: "Cabo Verde",                       dial: "+238", flag: "🇨🇻" },
  { code: "KH", name: "Cambodia",                         dial: "+855", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon",                         dial: "+237", flag: "🇨🇲" },
  { code: "CA", name: "Canada",                           dial: "+1",   flag: "🇨🇦" },
  { code: "CF", name: "Central African Republic",         dial: "+236", flag: "🇨🇫" },
  { code: "TD", name: "Chad",                             dial: "+235", flag: "🇹🇩" },
  { code: "CL", name: "Chile",                            dial: "+56",  flag: "🇨🇱" },
  { code: "CN", name: "China",                            dial: "+86",  flag: "🇨🇳" },
  { code: "CO", name: "Colombia",                         dial: "+57",  flag: "🇨🇴" },
  { code: "KM", name: "Comoros",                          dial: "+269", flag: "🇰🇲" },
  { code: "CG", name: "Congo",                            dial: "+242", flag: "🇨🇬" },
  { code: "CD", name: "Congo (DRC)",                      dial: "+243", flag: "🇨🇩" },
  { code: "CR", name: "Costa Rica",                       dial: "+506", flag: "🇨🇷" },
  { code: "HR", name: "Croatia",                          dial: "+385", flag: "🇭🇷" },
  { code: "CU", name: "Cuba",                             dial: "+53",  flag: "🇨🇺" },
  { code: "CY", name: "Cyprus",                           dial: "+357", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic",                   dial: "+420", flag: "🇨🇿" },
  { code: "DK", name: "Denmark",                          dial: "+45",  flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti",                         dial: "+253", flag: "🇩🇯" },
  { code: "DM", name: "Dominica",                         dial: "+1767",flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic",               dial: "+1809",flag: "🇩🇴" },
  { code: "EC", name: "Ecuador",                          dial: "+593", flag: "🇪🇨" },
  { code: "EG", name: "Egypt",                            dial: "+20",  flag: "🇪🇬" },
  { code: "SV", name: "El Salvador",                      dial: "+503", flag: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea",                dial: "+240", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea",                          dial: "+291", flag: "🇪🇷" },
  { code: "EE", name: "Estonia",                          dial: "+372", flag: "🇪🇪" },
  { code: "SZ", name: "Eswatini",                         dial: "+268", flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia",                         dial: "+251", flag: "🇪🇹" },
  { code: "FJ", name: "Fiji",                             dial: "+679", flag: "🇫🇯" },
  { code: "FI", name: "Finland",                          dial: "+358", flag: "🇫🇮" },
  { code: "FR", name: "France",                           dial: "+33",  flag: "🇫🇷" },
  { code: "GA", name: "Gabon",                            dial: "+241", flag: "🇬🇦" },
  { code: "GM", name: "Gambia",                           dial: "+220", flag: "🇬🇲" },
  { code: "GE", name: "Georgia",                          dial: "+995", flag: "🇬🇪" },
  { code: "DE", name: "Germany",                          dial: "+49",  flag: "🇩🇪" },
  { code: "GH", name: "Ghana",                            dial: "+233", flag: "🇬🇭" },
  { code: "GR", name: "Greece",                           dial: "+30",  flag: "🇬🇷" },
  { code: "GD", name: "Grenada",                          dial: "+1473",flag: "🇬🇩" },
  { code: "GT", name: "Guatemala",                        dial: "+502", flag: "🇬🇹" },
  { code: "GN", name: "Guinea",                           dial: "+224", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau",                    dial: "+245", flag: "🇬🇼" },
  { code: "GY", name: "Guyana",                           dial: "+592", flag: "🇬🇾" },
  { code: "HT", name: "Haiti",                            dial: "+509", flag: "🇭🇹" },
  { code: "HN", name: "Honduras",                         dial: "+504", flag: "🇭🇳" },
  { code: "HU", name: "Hungary",                          dial: "+36",  flag: "🇭🇺" },
  { code: "IS", name: "Iceland",                          dial: "+354", flag: "🇮🇸" },
  { code: "IN", name: "India",                            dial: "+91",  flag: "🇮🇳" },
  { code: "ID", name: "Indonesia",                        dial: "+62",  flag: "🇮🇩" },
  { code: "IR", name: "Iran",                             dial: "+98",  flag: "🇮🇷" },
  { code: "IQ", name: "Iraq",                             dial: "+964", flag: "🇮🇶" },
  { code: "IE", name: "Ireland",                          dial: "+353", flag: "🇮🇪" },
  { code: "IL", name: "Israel",                           dial: "+972", flag: "🇮🇱" },
  { code: "IT", name: "Italy",                            dial: "+39",  flag: "🇮🇹" },
  { code: "JM", name: "Jamaica",                          dial: "+1876",flag: "🇯🇲" },
  { code: "JP", name: "Japan",                            dial: "+81",  flag: "🇯🇵" },
  { code: "JO", name: "Jordan",                           dial: "+962", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan",                       dial: "+7",   flag: "🇰🇿" },
  { code: "KE", name: "Kenya",                            dial: "+254", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati",                         dial: "+686", flag: "🇰🇮" },
  { code: "KW", name: "Kuwait",                           dial: "+965", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan",                       dial: "+996", flag: "🇰🇬" },
  { code: "LA", name: "Laos",                             dial: "+856", flag: "🇱🇦" },
  { code: "LV", name: "Latvia",                           dial: "+371", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon",                          dial: "+961", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho",                          dial: "+266", flag: "🇱🇸" },
  { code: "LR", name: "Liberia",                          dial: "+231", flag: "🇱🇷" },
  { code: "LY", name: "Libya",                            dial: "+218", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein",                    dial: "+423", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania",                        dial: "+370", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg",                       dial: "+352", flag: "🇱🇺" },
  { code: "MG", name: "Madagascar",                       dial: "+261", flag: "🇲🇬" },
  { code: "MW", name: "Malawi",                           dial: "+265", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia",                         dial: "+60",  flag: "🇲🇾" },
  { code: "MV", name: "Maldives",                         dial: "+960", flag: "🇲🇻" },
  { code: "ML", name: "Mali",                             dial: "+223", flag: "🇲🇱" },
  { code: "MT", name: "Malta",                            dial: "+356", flag: "🇲🇹" },
  { code: "MH", name: "Marshall Islands",                 dial: "+692", flag: "🇲🇭" },
  { code: "MR", name: "Mauritania",                       dial: "+222", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius",                        dial: "+230", flag: "🇲🇺" },
  { code: "MX", name: "Mexico",                           dial: "+52",  flag: "🇲🇽" },
  { code: "FM", name: "Micronesia",                       dial: "+691", flag: "🇫🇲" },
  { code: "MD", name: "Moldova",                          dial: "+373", flag: "🇲🇩" },
  { code: "MC", name: "Monaco",                           dial: "+377", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia",                         dial: "+976", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro",                       dial: "+382", flag: "🇲🇪" },
  { code: "MA", name: "Morocco",                          dial: "+212", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique",                       dial: "+258", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar",                          dial: "+95",  flag: "🇲🇲" },
  { code: "NA", name: "Namibia",                          dial: "+264", flag: "🇳🇦" },
  { code: "NR", name: "Nauru",                            dial: "+674", flag: "🇳🇷" },
  { code: "NP", name: "Nepal",                            dial: "+977", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands",                      dial: "+31",  flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand",                      dial: "+64",  flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua",                        dial: "+505", flag: "🇳🇮" },
  { code: "NE", name: "Niger",                            dial: "+227", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria",                          dial: "+234", flag: "🇳🇬" },
  { code: "NO", name: "Norway",                           dial: "+47",  flag: "🇳🇴" },
  { code: "OM", name: "Oman",                             dial: "+968", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan",                         dial: "+92",  flag: "🇵🇰" },
  { code: "PW", name: "Palau",                            dial: "+680", flag: "🇵🇼" },
  { code: "PA", name: "Panama",                           dial: "+507", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea",                 dial: "+675", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay",                         dial: "+595", flag: "🇵🇾" },
  { code: "PE", name: "Peru",                             dial: "+51",  flag: "🇵🇪" },
  { code: "PH", name: "Philippines",                      dial: "+63",  flag: "🇵🇭" },
  { code: "PL", name: "Poland",                           dial: "+48",  flag: "🇵🇱" },
  { code: "PT", name: "Portugal",                         dial: "+351", flag: "🇵🇹" },
  { code: "QA", name: "Qatar",                            dial: "+974", flag: "🇶🇦" },
  { code: "RO", name: "Romania",                          dial: "+40",  flag: "🇷🇴" },
  { code: "RU", name: "Russia",                           dial: "+7",   flag: "🇷🇺" },
  { code: "RW", name: "Rwanda",                           dial: "+250", flag: "🇷🇼" },
  { code: "KN", name: "Saint Kitts and Nevis",            dial: "+1869",flag: "🇰🇳" },
  { code: "LC", name: "Saint Lucia",                      dial: "+1758",flag: "🇱🇨" },
  { code: "VC", name: "Saint Vincent and the Grenadines", dial: "+1784",flag: "🇻🇨" },
  { code: "WS", name: "Samoa",                            dial: "+685", flag: "🇼🇸" },
  { code: "SM", name: "San Marino",                       dial: "+378", flag: "🇸🇲" },
  { code: "ST", name: "Sao Tome and Principe",            dial: "+239", flag: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia",                     dial: "+966", flag: "🇸🇦" },
  { code: "SN", name: "Senegal",                          dial: "+221", flag: "🇸🇳" },
  { code: "RS", name: "Serbia",                           dial: "+381", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles",                       dial: "+248", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone",                     dial: "+232", flag: "🇸🇱" },
  { code: "SG", name: "Singapore",                        dial: "+65",  flag: "🇸🇬" },
  { code: "SK", name: "Slovakia",                         dial: "+421", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia",                         dial: "+386", flag: "🇸🇮" },
  { code: "SB", name: "Solomon Islands",                  dial: "+677", flag: "🇸🇧" },
  { code: "SO", name: "Somalia",                          dial: "+252", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa",                     dial: "+27",  flag: "🇿🇦" },
  { code: "SS", name: "South Sudan",                      dial: "+211", flag: "🇸🇸" },
  { code: "ES", name: "Spain",                            dial: "+34",  flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka",                        dial: "+94",  flag: "🇱🇰" },
  { code: "SD", name: "Sudan",                            dial: "+249", flag: "🇸🇩" },
  { code: "SR", name: "Suriname",                         dial: "+597", flag: "🇸🇷" },
  { code: "SE", name: "Sweden",                           dial: "+46",  flag: "🇸🇪" },
  { code: "CH", name: "Switzerland",                      dial: "+41",  flag: "🇨🇭" },
  { code: "SY", name: "Syria",                            dial: "+963", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan",                           dial: "+886", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan",                       dial: "+992", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania",                         dial: "+255", flag: "🇹🇿" },
  { code: "TH", name: "Thailand",                         dial: "+66",  flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste",                      dial: "+670", flag: "🇹🇱" },
  { code: "TG", name: "Togo",                             dial: "+228", flag: "🇹🇬" },
  { code: "TO", name: "Tonga",                            dial: "+676", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago",              dial: "+1868",flag: "🇹🇹" },
  { code: "TN", name: "Tunisia",                          dial: "+216", flag: "🇹🇳" },
  { code: "TR", name: "Turkey",                           dial: "+90",  flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan",                     dial: "+993", flag: "🇹🇲" },
  { code: "TV", name: "Tuvalu",                           dial: "+688", flag: "🇹🇻" },
  { code: "UG", name: "Uganda",                           dial: "+256", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine",                          dial: "+380", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates",             dial: "+971", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom",                   dial: "+44",  flag: "🇬🇧" },
  { code: "US", name: "United States",                    dial: "+1",   flag: "🇺🇸" },
  { code: "UY", name: "Uruguay",                          dial: "+598", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan",                       dial: "+998", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu",                          dial: "+678", flag: "🇻🇺" },
  { code: "VE", name: "Venezuela",                        dial: "+58",  flag: "🇻🇪" },
  { code: "VN", name: "Vietnam",                          dial: "+84",  flag: "🇻🇳" },
  { code: "YE", name: "Yemen",                            dial: "+967", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia",                           dial: "+260", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe",                         dial: "+263", flag: "🇿🇼" },
];

export function findCountryByDial(dial) {
  return (
    COUNTRIES.find((c) => c.dial === dial) ??
    COUNTRIES.find((c) => c.code === "IN")
  );
}

export default function CountryCodePicker({ value = "+91", onChange, disabled = false }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const ref               = useRef(null);
  const searchRef         = useRef(null);

  const selected = findCountryByDial(value) ?? COUNTRIES.find((c) => c.code === "IN");

  // Close on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  // Filter by country name only
  const filtered = COUNTRIES.filter((c) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q);
  });

  function handleSelect(country) {
    onChange?.(country.dial);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={ref}>

      {/* ── Trigger: dial code + chevron only, no flag, no country code ── */}
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        disabled={disabled}
        className="h-[48px] flex items-center gap-1 px-3 bg-transparent text-[14px] font-medium text-[#20242a] outline-none disabled:opacity-50 whitespace-nowrap"
      >
        <span>{selected.dial}</span>
        <ChevronDown
          size={13}
          className={`text-[#5b626a] flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-[9999] w-[270px] rounded-[14px] border border-[#e7ecef] bg-white shadow-xl overflow-hidden">

          {/* Search bar */}
          <div className="p-2.5 border-b border-[#f0f3f5]">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-3 text-[#9ca3af] pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country..."
                className="w-full pl-8 pr-8 py-2 text-[13px] border border-[#e5e7eb] rounded-[8px] text-[#20242a] placeholder:text-[#9ca3af] outline-none focus:border-[#155966] focus:ring-1 focus:ring-[#155966]/20 transition"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 text-[#9ca3af] hover:text-[#5b626a] transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Country list: flag + name + dial */}
          <ul className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-4 text-[13px] text-[#9ca3af] text-center">
                No results found
              </li>
            ) : (
              filtered.map((country) => {
                const isSelected = country.code === selected.code;
                return (
                  <li
                    key={country.code}
                    onClick={() => handleSelect(country)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors text-[13px] ${
                      isSelected
                        ? "bg-[#eef6f9] text-[#155966] font-medium"
                        : "text-[#20242a] hover:bg-[#f5fafc]"
                    }`}
                  >
                    <span className="text-[18px] leading-none w-6 text-center flex-shrink-0">
                      {country.flag}
                    </span>
                    <span className="flex-1 truncate">{country.name}</span>
                    <span className={`flex-shrink-0 text-[12px] font-mono ${isSelected ? "text-[#155966]" : "text-[#6b7280]"}`}>
                      {country.dial}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}