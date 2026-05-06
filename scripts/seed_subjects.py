"""
GTU ExamAI — Comprehensive Subject Seed
Covers:
  BE  : COMMON (Sem 1-2), CE, IT, ME, CIVIL, EE, EC, CHEM, AUTO
  DIPLOMA: COMMON (Sem 1), CO, ME, CIVIL, EE, EC

Run: python scripts/seed_subjects.py
Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY set below (or via .env)
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://opkfzdgopijxfosnozsv.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wa2Z6ZGdvcGlqeGZvc25venN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMwNzUxOCwiZXhwIjoyMDkyODgzNTE4fQ.xR8-2VWMdSmsthe4JBU9RvSgdv_9pVMQVkUmJNTxdaQ",
)

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def s(name, code, branch, semester, program="BE"):
    return {"name": name, "code": code, "branch": branch, "semester": semester, "program": program}


# ---------------------------------------------------------------------------
# BE — Common (Sem 1 & 2, all BE branches)
# branch="COMMON" so API returns these for any branch filter
# ---------------------------------------------------------------------------
BE_COMMON = [
    # Sem 1
    s("Mathematics-I",                          "3110014", "COMMON", 1),
    s("Physics",                                "3110011", "COMMON", 1),
    s("English for Communication",              "3110002", "COMMON", 1),
    s("Engineering Drawing and Graphics",       "3110013", "COMMON", 1),
    s("Workshop / Manufacturing Practices",     "3110007", "COMMON", 1),
    s("ICT Tools and Cybersecurity",            "3110009", "COMMON", 1),
    # Sem 2
    s("Mathematics-II",                         "3120007", "COMMON", 2),
    s("Chemistry",                              "3110003", "COMMON", 2),
    s("Environmental Science",                  "3110006", "COMMON", 2),
    s("Programming for Problem Solving (C)",    "3120003", "COMMON", 2),
    s("Basics of Electrical Engineering",       "3120004", "COMMON", 2),
    s("Engineering Mechanics",                  "3120001", "COMMON", 2),
    # Common Sem 3 (across most branches)
    s("Effective Technical Communication",      "3130004", "COMMON", 3),
    s("Probability and Statistics",             "3130006", "COMMON", 3),
    s("Indian Constitution",                    "3130007", "COMMON", 3),
    s("Design Engineering-1A",                  "3130008", "COMMON", 3),
    # Common Sem 4
    s("Design Engineering-1B",                  "3140005", "COMMON", 4),
    s("Principles of Economics and Management", "3140709", "COMMON", 4),
    # Common Sem 5
    s("Design Engineering-IIA",                 "3150001", "COMMON", 5),
    s("Professional Ethics",                    "3150709", "COMMON", 5),
    # Common Sem 6
    s("Design Engineering-IIB",                 "3160001", "COMMON", 6),
    # Common Sem 8 (all BE)
    s("Project Phase-II",                       "3180001", "COMMON", 8),
    s("Technical Seminar",                      "3180002", "COMMON", 8),
]

# ---------------------------------------------------------------------------
# BE — Computer Engineering (CE)
# ---------------------------------------------------------------------------
BE_CE = [
    # Sem 3
    s("Data Structures",                            "3130702", "CE", 3),
    s("Database Management Systems",                "3130703", "CE", 3),
    s("Digital Fundamentals",                       "3130704", "CE", 3),
    # Sem 4
    s("Operating System",                           "3140702", "CE", 4),
    s("Object Oriented Programming I",              "3140705", "CE", 4),
    s("Computer Organization and Architecture",     "3140707", "CE", 4),
    s("Discrete Mathematics",                       "3140708", "CE", 4),
    # Sem 5
    s("Analysis and Design of Algorithms",          "3150703", "CE", 5),
    s("Computer Networks",                          "3150710", "CE", 5),
    s("Software Engineering",                       "3150711", "CE", 5),
    s("Computer Graphics",                          "3150712", "CE", 5),
    s("Python for Data Science",                    "3150713", "CE", 5),
    s("Cyber Security",                             "3150714", "CE", 5),
    # Sem 6
    s("Theory of Computation",                      "3160704", "CE", 6),
    s("Advanced Java Programming",                  "3160707", "CE", 6),
    s("Microprocessor and Interfacing",             "3160712", "CE", 6),
    s("Web Programming",                            "3160713", "CE", 6),
    s("Data Mining",                                "3160714", "CE", 6),
    s("System Software",                            "3160715", "CE", 6),
    s("IOT and Applications",                       "3160716", "CE", 6),
    s("Data Visualization",                         "3160717", "CE", 6),
    # Sem 7
    s("Compiler Design",                            "3170701", "CE", 7),
    s("Mobile Computing and Wireless Communication","3170710", "CE", 7),
    s("Artificial Intelligence",                    "3170716", "CE", 7),
    s("Cloud Computing",                            "3170717", "CE", 7),
    s("Information Retrieval",                      "3170718", "CE", 7),
    s("Distributed System",                         "3170719", "CE", 7),
    s("Information Security",                       "3170720", "CE", 7),
    s("Parallel and Distributed Computing",         "3170721", "CE", 7),
    s("Big Data Analytics",                         "3170722", "CE", 7),
    s("Natural Language Processing",                "3170723", "CE", 7),
    s("Machine Learning",                           "3170724", "CE", 7),
    s("Digital Forensics",                          "3170725", "CE", 7),
    s("Mobile Application Development",             "3170726", "CE", 7),
    # Sem 8
    s("Project Phase-I",                            "3180701", "CE", 8),
]

# ---------------------------------------------------------------------------
# BE — Information Technology (IT)
# ---------------------------------------------------------------------------
BE_IT = [
    # Sem 3
    s("Data Structures",                            "3130702", "IT", 3),
    s("Database Management Systems",               "3130703", "IT", 3),
    s("Digital Fundamentals",                       "3130704", "IT", 3),
    # Sem 4
    s("Object Oriented Programming I",              "3140705", "IT", 4),
    s("Computer Organization and Architecture",     "3140707", "IT", 4),
    s("Discrete Mathematics",                       "3140708", "IT", 4),
    s("Operating System and Virtualization",        "3141601", "IT", 4),
    # Sem 5
    s("Analysis and Design of Algorithms",          "3150703", "IT", 5),
    s("Computer Networks",                          "3150710", "IT", 5),
    s("Cyber Security",                             "3150714", "IT", 5),
    s("Object Oriented Analysis and Design",        "3151604", "IT", 5),
    s("Formal Language and Automata Theory",        "3151605", "IT", 5),
    s("Web Development",                            "3151606", "IT", 5),
    s("Computer Graphics and Visualization",        "3151607", "IT", 5),
    s("Data Science",                               "3151608", "IT", 5),
    # Sem 6
    s("Image Processing",                           "3161604", "IT", 6),
    s("Software Engineering",                       "3161605", "IT", 6),
    s("Cryptography and Network Security",          "3161606", "IT", 6),
    s("Big Data Analytics",                         "3161607", "IT", 6),
    s("Artificial Intelligence",                    "3161608", "IT", 6),
    s("Enterprise Application Development",         "3161609", "IT", 6),
    s("Data Warehousing and Mining",                "3161610", "IT", 6),
    s("Advanced Web Programming",                   "3161611", "IT", 6),
    s("Mobile Application Development",             "3161612", "IT", 6),
    s("Data Analysis and Visualization",            "3161613", "IT", 6),
    # Sem 7
    s("Information Retrieval",                      "3170718", "IT", 7),
    s("Internet of Things",                         "3171108", "IT", 7),
    s("Wireless Communication",                     "3171608", "IT", 7),
    s("Software Project Management",                "3171609", "IT", 7),
    s("Agile Development and UI/UX Design",         "3171610", "IT", 7),
    s("Graph Theory and Combinatorics",             "3171611", "IT", 7),
    s("Virtual and Augmented Reality",              "3171612", "IT", 7),
    s("Pattern Recognition",                        "3171613", "IT", 7),
    s("Computer Vision",                            "3171614", "IT", 7),
    s("Data Compression",                           "3171615", "IT", 7),
    s("Internetwork Security and Web Analytics",    "3171616", "IT", 7),
    s("Applied Machine Learning",                   "3171617", "IT", 7),
    s("Blockchain",                                 "3171618", "IT", 7),
    # Sem 8
    s("Project Phase-I",                            "3181601", "IT", 8),
]

# ---------------------------------------------------------------------------
# BE — Mechanical Engineering (ME)
# GTU branch digit: 19
# ---------------------------------------------------------------------------
BE_ME = [
    # Sem 3
    s("Fluid Mechanics",                            "3131901", "ME", 3),
    s("Engineering Thermodynamics",                 "3131902", "ME", 3),
    s("Theory of Machines-I",                       "3131903", "ME", 3),
    s("Material Science and Engineering",           "3131904", "ME", 3),
    s("Manufacturing Engineering-I",               "3131905", "ME", 3),
    # Sem 4
    s("Heat and Mass Transfer",                     "3141901", "ME", 4),
    s("Dynamics of Machinery",                      "3141902", "ME", 4),
    s("Design of Machine Elements-I",               "3141903", "ME", 4),
    s("Metrology and Quality Control",              "3141904", "ME", 4),
    s("Manufacturing Engineering-II",              "3141905", "ME", 4),
    # Sem 5
    s("Design of Machine Elements-II",              "3151901", "ME", 5),
    s("Refrigeration and Air Conditioning",         "3151902", "ME", 5),
    s("Industrial Engineering and Management",      "3151903", "ME", 5),
    s("CAD/CAM and Automation",                     "3151904", "ME", 5),
    s("Advanced Manufacturing Processes",           "3151905", "ME", 5),
    s("Finite Element Analysis",                    "3151906", "ME", 5),
    # Sem 6
    s("Power Plant Engineering",                    "3161901", "ME", 6),
    s("Automobile Engineering",                     "3161902", "ME", 6),
    s("Hydraulics and Pneumatics",                  "3161903", "ME", 6),
    s("Operations Research",                        "3161904", "ME", 6),
    s("Quality Engineering",                        "3161905", "ME", 6),
    s("Welding Technology",                         "3161906", "ME", 6),
    # Sem 7
    s("Mechatronics",                               "3171901", "ME", 7),
    s("Robotics and Automation",                    "3171902", "ME", 7),
    s("Composite Materials",                        "3171903", "ME", 7),
    s("Non-Destructive Testing",                    "3171904", "ME", 7),
    s("Renewable Energy Sources",                   "3171905", "ME", 7),
    s("Lean Manufacturing",                         "3171906", "ME", 7),
    s("Product Design and Development",             "3171907", "ME", 7),
    s("Thermal Power Engineering",                  "3171908", "ME", 7),
    # Sem 8
    s("Project Phase-I",                            "3181901", "ME", 8),
]

# ---------------------------------------------------------------------------
# BE — Civil Engineering (CIVIL)
# GTU branch digit: 03
# ---------------------------------------------------------------------------
BE_CIVIL = [
    # Sem 3
    s("Surveying",                                  "3130301", "CIVIL", 3),
    s("Building Materials and Construction",        "3130302", "CIVIL", 3),
    s("Structural Analysis-I",                      "3130303", "CIVIL", 3),
    s("Fluid Mechanics",                            "3130304", "CIVIL", 3),
    s("Soil Mechanics",                             "3130305", "CIVIL", 3),
    s("Geology",                                    "3130306", "CIVIL", 3),
    # Sem 4
    s("Design of Concrete Structures-I",            "3140301", "CIVIL", 4),
    s("Hydraulics",                                 "3140302", "CIVIL", 4),
    s("Transportation Engineering-I",              "3140303", "CIVIL", 4),
    s("Structural Analysis-II",                     "3140304", "CIVIL", 4),
    s("Geotechnical Engineering",                   "3140305", "CIVIL", 4),
    s("Surveying-II",                               "3140306", "CIVIL", 4),
    # Sem 5
    s("Design of Concrete Structures-II",           "3150301", "CIVIL", 5),
    s("Design of Steel Structures",                 "3150302", "CIVIL", 5),
    s("Transportation Engineering-II",             "3150303", "CIVIL", 5),
    s("Water Supply Engineering",                   "3150304", "CIVIL", 5),
    s("Environmental Engineering",                  "3150305", "CIVIL", 5),
    s("Advanced Surveying",                         "3150306", "CIVIL", 5),
    # Sem 6
    s("Construction Management",                    "3160301", "CIVIL", 6),
    s("Foundation Engineering",                     "3160302", "CIVIL", 6),
    s("Irrigation Engineering",                     "3160303", "CIVIL", 6),
    s("Earthquake Engineering",                     "3160304", "CIVIL", 6),
    s("Pre-stressed Concrete",                      "3160305", "CIVIL", 6),
    s("Advanced Concrete Technology",               "3160306", "CIVIL", 6),
    # Sem 7
    s("Remote Sensing and GIS",                     "3170301", "CIVIL", 7),
    s("Advanced Foundation Design",                 "3170302", "CIVIL", 7),
    s("Urban Planning",                             "3170303", "CIVIL", 7),
    s("Traffic Engineering",                        "3170304", "CIVIL", 7),
    s("Solid Waste Management",                     "3170305", "CIVIL", 7),
    s("Coastal Engineering",                        "3170306", "CIVIL", 7),
    s("Quantity Surveying and Valuation",           "3170307", "CIVIL", 7),
    # Sem 8
    s("Project Phase-I",                            "3180301", "CIVIL", 8),
]

# ---------------------------------------------------------------------------
# BE — Electrical Engineering (EE)
# GTU branch digit: 05
# ---------------------------------------------------------------------------
BE_EE = [
    # Sem 3
    s("Electrical Machines-I",                      "3130501", "EE", 3),
    s("Network Analysis",                           "3130502", "EE", 3),
    s("Control System-I",                           "3130503", "EE", 3),
    s("Power Electronics-I",                        "3130504", "EE", 3),
    s("Signals and Systems",                        "3130505", "EE", 3),
    # Sem 4
    s("Electrical Machines-II",                     "3140501", "EE", 4),
    s("Power Systems-I",                            "3140502", "EE", 4),
    s("Digital Electronics",                        "3140503", "EE", 4),
    s("Microprocessors",                            "3140504", "EE", 4),
    s("Instrumentation and Measurement",            "3140505", "EE", 4),
    s("Control System-II",                          "3140506", "EE", 4),
    # Sem 5
    s("Power Systems-II",                           "3150501", "EE", 5),
    s("Electrical Machine Design",                  "3150502", "EE", 5),
    s("Switchgear and Protection",                  "3150503", "EE", 5),
    s("Power System Analysis",                      "3150504", "EE", 5),
    s("Digital Signal Processing",                  "3150505", "EE", 5),
    s("Power Electronics-II",                       "3150506", "EE", 5),
    # Sem 6
    s("Utilization of Electrical Energy",           "3160501", "EE", 6),
    s("Power Quality",                              "3160502", "EE", 6),
    s("Programmable Logic Controllers",             "3160503", "EE", 6),
    s("Renewable Energy Systems",                   "3160504", "EE", 6),
    s("Industrial Drives",                          "3160505", "EE", 6),
    s("Power System Operation and Control",         "3160506", "EE", 6),
    # Sem 7
    s("Smart Grid",                                 "3170501", "EE", 7),
    s("FACTS Devices",                              "3170502", "EE", 7),
    s("High Voltage Engineering",                   "3170503", "EE", 7),
    s("Energy Audit and Management",                "3170504", "EE", 7),
    s("Embedded Systems",                           "3170505", "EE", 7),
    s("Power System Protection",                    "3170506", "EE", 7),
    s("Electric Vehicles",                          "3170507", "EE", 7),
    # Sem 8
    s("Project Phase-I",                            "3180501", "EE", 8),
]

# ---------------------------------------------------------------------------
# BE — Electronics & Communication (EC)
# GTU branch digit: 06
# ---------------------------------------------------------------------------
BE_EC = [
    # Sem 3
    s("Electronic Devices and Circuits",            "3130601", "EC", 3),
    s("Signals and Systems",                        "3130602", "EC", 3),
    s("Analog Communication",                       "3130603", "EC", 3),
    s("Network Theory",                             "3130604", "EC", 3),
    s("Digital Electronics",                        "3130605", "EC", 3),
    # Sem 4
    s("Digital Communication",                      "3140601", "EC", 4),
    s("Microprocessor and Microcontroller",         "3140602", "EC", 4),
    s("Control Systems",                            "3140603", "EC", 4),
    s("Electromagnetic Waves",                      "3140604", "EC", 4),
    s("VLSI Design",                                "3140605", "EC", 4),
    s("Linear Integrated Circuits",                 "3140606", "EC", 4),
    # Sem 5
    s("Wireless Communication",                     "3150601", "EC", 5),
    s("Digital Signal Processing",                  "3150602", "EC", 5),
    s("Antenna Theory",                             "3150603", "EC", 5),
    s("Optical Fiber Communication",                "3150604", "EC", 5),
    s("Embedded Systems",                           "3150605", "EC", 5),
    s("Communication Networks",                     "3150606", "EC", 5),
    # Sem 6
    s("Mobile Communication",                       "3160601", "EC", 6),
    s("Satellite Communication",                    "3160602", "EC", 6),
    s("MEMS",                                       "3160603", "EC", 6),
    s("Advanced VLSI Design",                       "3160604", "EC", 6),
    s("Communication Protocols",                    "3160605", "EC", 6),
    s("RF and Microwave Engineering",               "3160606", "EC", 6),
    # Sem 7
    s("Internet of Things",                         "3170601", "EC", 7),
    s("Cognitive Radio",                            "3170602", "EC", 7),
    s("Image Processing",                           "3170603", "EC", 7),
    s("Speech and Audio Processing",                "3170604", "EC", 7),
    s("5G Communications",                          "3170605", "EC", 7),
    s("Advanced Embedded Systems",                  "3170606", "EC", 7),
    s("Machine Learning for Signal Processing",     "3170607", "EC", 7),
    # Sem 8
    s("Project Phase-I",                            "3180601", "EC", 8),
]

# ---------------------------------------------------------------------------
# BE — Chemical Engineering (CHEM)
# GTU branch digit: 02
# ---------------------------------------------------------------------------
BE_CHEM = [
    # Sem 3
    s("Chemical Process Calculations",              "3130201", "CHEM", 3),
    s("Fluid Flow Operations",                      "3130202", "CHEM", 3),
    s("Heat Transfer Operations",                   "3130203", "CHEM", 3),
    s("Mass Transfer Operations-I",                 "3130204", "CHEM", 3),
    s("Chemical Engineering Thermodynamics",        "3130205", "CHEM", 3),
    # Sem 4
    s("Mass Transfer Operations-II",                "3140201", "CHEM", 4),
    s("Chemical Reaction Engineering-I",            "3140202", "CHEM", 4),
    s("Process Control and Instrumentation",        "3140203", "CHEM", 4),
    s("Transport Phenomena",                        "3140204", "CHEM", 4),
    s("Organic Chemistry",                          "3140205", "CHEM", 4),
    # Sem 5
    s("Chemical Reaction Engineering-II",           "3150201", "CHEM", 5),
    s("Plant Design and Economics",                 "3150202", "CHEM", 5),
    s("Separation Processes",                       "3150203", "CHEM", 5),
    s("Petroleum Refining",                         "3150204", "CHEM", 5),
    s("Biochemical Engineering",                    "3150205", "CHEM", 5),
    # Sem 6
    s("Process Safety and Management",              "3160201", "CHEM", 6),
    s("Polymer Technology",                         "3160202", "CHEM", 6),
    s("Catalysis Engineering",                      "3160203", "CHEM", 6),
    s("Industrial Wastewater Treatment",            "3160204", "CHEM", 6),
    s("Food Technology",                            "3160205", "CHEM", 6),
    # Sem 7
    s("Advanced Separation Processes",              "3170201", "CHEM", 7),
    s("Nanotechnology",                             "3170202", "CHEM", 7),
    s("Pharmaceutical Technology",                  "3170203", "CHEM", 7),
    s("Industrial Pollution Control",               "3170204", "CHEM", 7),
    s("Process Optimization",                       "3170205", "CHEM", 7),
    s("Green Chemistry",                            "3170206", "CHEM", 7),
    # Sem 8
    s("Project Phase-I",                            "3180201", "CHEM", 8),
]

# ---------------------------------------------------------------------------
# BE — Automobile Engineering (AUTO)
# GTU branch digit: 17
# ---------------------------------------------------------------------------
BE_AUTO = [
    # Sem 3
    s("Engineering Thermodynamics",                 "3131701", "AUTO", 3),
    s("Theory of Machines",                         "3131702", "AUTO", 3),
    s("Material Science",                           "3131703", "AUTO", 3),
    s("Manufacturing Engineering",                  "3131704", "AUTO", 3),
    s("Fluid Mechanics",                            "3131705", "AUTO", 3),
    # Sem 4
    s("Machine Design",                             "3141701", "AUTO", 4),
    s("Heat Transfer",                              "3141702", "AUTO", 4),
    s("Dynamics of Machinery",                      "3141703", "AUTO", 4),
    s("Metrology and Quality Control",              "3141704", "AUTO", 4),
    s("Vehicle Structure and Aerodynamics",         "3141705", "AUTO", 4),
    # Sem 5
    s("Automotive Engine Technology",               "3151701", "AUTO", 5),
    s("Transmission and Chassis",                   "3151702", "AUTO", 5),
    s("Automotive Electrical Systems",              "3151703", "AUTO", 5),
    s("CAD/CAM",                                    "3151704", "AUTO", 5),
    s("Automotive Materials",                       "3151705", "AUTO", 5),
    # Sem 6
    s("Vehicle Dynamics",                           "3161701", "AUTO", 6),
    s("Alternative Fuels",                          "3161702", "AUTO", 6),
    s("Automotive Emission Control",                "3161703", "AUTO", 6),
    s("Automotive Manufacturing",                   "3161704", "AUTO", 6),
    s("Electric Vehicles",                          "3161705", "AUTO", 6),
    # Sem 7
    s("Hybrid and Electric Powertrain",             "3171701", "AUTO", 7),
    s("Automotive Safety",                          "3171702", "AUTO", 7),
    s("ADAS and Autonomous Vehicles",               "3171703", "AUTO", 7),
    s("Connected Vehicle Technology",               "3171704", "AUTO", 7),
    s("Racing Technology",                          "3171705", "AUTO", 7),
    # Sem 8
    s("Project Phase-I",                            "3181701", "AUTO", 8),
]

# ===========================================================================
# DIPLOMA PROGRAMS
# Code prefix: 33 (vs 31 for BE)
# branch="COMMON" for sem-1 subjects shared across all Diploma branches
# ===========================================================================

DIPLOMA_COMMON = [
    # Sem 1 — common foundation for all Diploma branches
    s("Applied Mathematics-I",              "3310002", "COMMON", 1, "DIPLOMA"),
    s("Applied Physics",                    "3310003", "COMMON", 1, "DIPLOMA"),
    s("Applied Chemistry",                  "3310004", "COMMON", 1, "DIPLOMA"),
    s("Communication Skills in English",    "3310001", "COMMON", 1, "DIPLOMA"),
    s("Engineering Drawing",                "3310005", "COMMON", 1, "DIPLOMA"),
    s("Computer Fundamentals",              "3310006", "COMMON", 1, "DIPLOMA"),
    # Sem 2 — partially common
    s("Applied Mathematics-II",             "3320002", "COMMON", 2, "DIPLOMA"),
    s("Environmental Science",              "3320001", "COMMON", 2, "DIPLOMA"),
]

# ---------------------------------------------------------------------------
# Diploma — Computer Engineering (CO)
# ---------------------------------------------------------------------------
DIPLOMA_CO = [
    # Sem 2
    s("Data Communication Fundamentals",        "3324101", "CO", 2, "DIPLOMA"),
    s("Programming in C",                       "3324102", "CO", 2, "DIPLOMA"),
    s("Digital Techniques",                     "3324103", "CO", 2, "DIPLOMA"),
    s("Operating Systems Fundamentals",         "3324104", "CO", 2, "DIPLOMA"),
    # Sem 3
    s("Data Structures using C",                "3334101", "CO", 3, "DIPLOMA"),
    s("Computer Hardware and Troubleshooting",  "3334102", "CO", 3, "DIPLOMA"),
    s("Object Oriented Programming (C++)",      "3334103", "CO", 3, "DIPLOMA"),
    s("Web Design",                             "3334104", "CO", 3, "DIPLOMA"),
    s("Computer Graphics",                      "3334105", "CO", 3, "DIPLOMA"),
    s("Discrete Mathematics",                   "3334106", "CO", 3, "DIPLOMA"),
    # Sem 4
    s("Advanced Java Programming",              "3344101", "CO", 4, "DIPLOMA"),
    s("Database Management System",             "3344102", "CO", 4, "DIPLOMA"),
    s("Software Engineering",                   "3344103", "CO", 4, "DIPLOMA"),
    s("Linux Administration",                   "3344104", "CO", 4, "DIPLOMA"),
    s("Computer Networks",                      "3344105", "CO", 4, "DIPLOMA"),
    s("Python Programming",                     "3344106", "CO", 4, "DIPLOMA"),
    # Sem 5
    s("Advanced Web Programming",               "3354101", "CO", 5, "DIPLOMA"),
    s("Mobile Application Development",         "3354102", "CO", 5, "DIPLOMA"),
    s("Artificial Intelligence Fundamentals",   "3354103", "CO", 5, "DIPLOMA"),
    s("Cyber Security",                         "3354104", "CO", 5, "DIPLOMA"),
    s("Cloud Computing",                        "3354105", "CO", 5, "DIPLOMA"),
    s("Advanced Database",                      "3354106", "CO", 5, "DIPLOMA"),
    # Sem 6
    s("Machine Learning Fundamentals",          "3364101", "CO", 6, "DIPLOMA"),
    s("Big Data Analytics",                     "3364102", "CO", 6, "DIPLOMA"),
    s("Internet of Things",                     "3364103", "CO", 6, "DIPLOMA"),
    s("Project Work",                           "3364104", "CO", 6, "DIPLOMA"),
    s("Entrepreneurship Development",           "3364105", "CO", 6, "DIPLOMA"),
]

# ---------------------------------------------------------------------------
# Diploma — Mechanical Engineering (ME)
# ---------------------------------------------------------------------------
DIPLOMA_ME = [
    # Sem 2
    s("Elements of Mechanical Engineering",     "3321901", "ME", 2, "DIPLOMA"),
    s("Engineering Materials",                  "3321902", "ME", 2, "DIPLOMA"),
    s("Workshop Practice",                      "3321903", "ME", 2, "DIPLOMA"),
    s("Computer Aided Drawing",                 "3321904", "ME", 2, "DIPLOMA"),
    # Sem 3
    s("Fluid Power Engineering",                "3331901", "ME", 3, "DIPLOMA"),
    s("Thermal Engineering",                    "3331902", "ME", 3, "DIPLOMA"),
    s("Machine Elements",                       "3331903", "ME", 3, "DIPLOMA"),
    s("Manufacturing Technology-I",             "3331904", "ME", 3, "DIPLOMA"),
    s("Metrology and Measurements",             "3331905", "ME", 3, "DIPLOMA"),
    # Sem 4
    s("Design of Machine Elements",             "3341901", "ME", 4, "DIPLOMA"),
    s("Heat Transfer",                          "3341902", "ME", 4, "DIPLOMA"),
    s("Manufacturing Technology-II",            "3341903", "ME", 4, "DIPLOMA"),
    s("CAD/CAM",                                "3341904", "ME", 4, "DIPLOMA"),
    s("Industrial Engineering",                 "3341905", "ME", 4, "DIPLOMA"),
    # Sem 5
    s("Automobile Engineering",                 "3351901", "ME", 5, "DIPLOMA"),
    s("Power Plant Engineering",                "3351902", "ME", 5, "DIPLOMA"),
    s("Advanced Manufacturing",                 "3351903", "ME", 5, "DIPLOMA"),
    s("Hydraulics and Pneumatics",              "3351904", "ME", 5, "DIPLOMA"),
    s("Quality Control",                        "3351905", "ME", 5, "DIPLOMA"),
    # Sem 6
    s("Mechatronics",                           "3361901", "ME", 6, "DIPLOMA"),
    s("Renewable Energy Technology",            "3361902", "ME", 6, "DIPLOMA"),
    s("Environment and Pollution Control",      "3361903", "ME", 6, "DIPLOMA"),
    s("Project Work",                           "3361904", "ME", 6, "DIPLOMA"),
    s("Entrepreneurship Development",           "3361905", "ME", 6, "DIPLOMA"),
]

# ---------------------------------------------------------------------------
# Diploma — Civil Engineering (CIVIL)
# ---------------------------------------------------------------------------
DIPLOMA_CIVIL = [
    # Sem 2
    s("Building Construction",                  "3320301", "CIVIL", 2, "DIPLOMA"),
    s("Surveying-I",                            "3320302", "CIVIL", 2, "DIPLOMA"),
    s("Building Materials",                     "3320303", "CIVIL", 2, "DIPLOMA"),
    s("Computer Aided Drawing",                 "3320304", "CIVIL", 2, "DIPLOMA"),
    # Sem 3
    s("Structural Mechanics",                   "3330301", "CIVIL", 3, "DIPLOMA"),
    s("Surveying-II",                           "3330302", "CIVIL", 3, "DIPLOMA"),
    s("Concrete Technology",                    "3330303", "CIVIL", 3, "DIPLOMA"),
    s("Fluid Mechanics",                        "3330304", "CIVIL", 3, "DIPLOMA"),
    s("Soil Mechanics",                         "3330305", "CIVIL", 3, "DIPLOMA"),
    # Sem 4
    s("Design of Concrete Structures",          "3340301", "CIVIL", 4, "DIPLOMA"),
    s("Hydraulics",                             "3340302", "CIVIL", 4, "DIPLOMA"),
    s("Transportation Engineering-I",           "3340303", "CIVIL", 4, "DIPLOMA"),
    s("Environmental Engineering",              "3340304", "CIVIL", 4, "DIPLOMA"),
    s("Construction Management",                "3340305", "CIVIL", 4, "DIPLOMA"),
    # Sem 5
    s("Design of Steel Structures",             "3350301", "CIVIL", 5, "DIPLOMA"),
    s("Advanced Surveying",                     "3350302", "CIVIL", 5, "DIPLOMA"),
    s("Foundation Engineering",                 "3350303", "CIVIL", 5, "DIPLOMA"),
    s("Estimation and Costing",                 "3350304", "CIVIL", 5, "DIPLOMA"),
    s("Irrigation Engineering",                 "3350305", "CIVIL", 5, "DIPLOMA"),
    # Sem 6
    s("Quantity Surveying and Valuation",       "3360301", "CIVIL", 6, "DIPLOMA"),
    s("Earthquake Resistant Structures",        "3360302", "CIVIL", 6, "DIPLOMA"),
    s("Urban Planning",                         "3360303", "CIVIL", 6, "DIPLOMA"),
    s("Project Work",                           "3360304", "CIVIL", 6, "DIPLOMA"),
    s("Entrepreneurship Development",           "3360305", "CIVIL", 6, "DIPLOMA"),
]

# ---------------------------------------------------------------------------
# Diploma — Electrical Engineering (EE)
# ---------------------------------------------------------------------------
DIPLOMA_EE = [
    # Sem 2
    s("Electrical Engineering Materials",       "3320501", "EE", 2, "DIPLOMA"),
    s("Circuit Fundamentals",                   "3320502", "EE", 2, "DIPLOMA"),
    s("Basic Electronics",                      "3320503", "EE", 2, "DIPLOMA"),
    s("Electrical Drawing",                     "3320504", "EE", 2, "DIPLOMA"),
    # Sem 3
    s("AC Circuits",                            "3330501", "EE", 3, "DIPLOMA"),
    s("Electrical Machines-I",                  "3330502", "EE", 3, "DIPLOMA"),
    s("Electronic Devices and Circuits",        "3330503", "EE", 3, "DIPLOMA"),
    s("Electrical Measurements",                "3330504", "EE", 3, "DIPLOMA"),
    s("Wiring and Earthing",                    "3330505", "EE", 3, "DIPLOMA"),
    # Sem 4
    s("Electrical Machines-II",                 "3340501", "EE", 4, "DIPLOMA"),
    s("Power Electronics",                      "3340502", "EE", 4, "DIPLOMA"),
    s("Microcontrollers",                       "3340503", "EE", 4, "DIPLOMA"),
    s("Digital Electronics",                    "3340504", "EE", 4, "DIPLOMA"),
    s("Control Systems",                        "3340505", "EE", 4, "DIPLOMA"),
    # Sem 5
    s("Power Systems",                          "3350501", "EE", 5, "DIPLOMA"),
    s("Industrial Drives",                      "3350502", "EE", 5, "DIPLOMA"),
    s("PLC and SCADA",                          "3350503", "EE", 5, "DIPLOMA"),
    s("Renewable Energy Technology",            "3350504", "EE", 5, "DIPLOMA"),
    s("Switchgear and Protection",              "3350505", "EE", 5, "DIPLOMA"),
    # Sem 6
    s("Electrical Installation and Maintenance","3360501", "EE", 6, "DIPLOMA"),
    s("Energy Management",                      "3360502", "EE", 6, "DIPLOMA"),
    s("Project Work",                           "3360503", "EE", 6, "DIPLOMA"),
    s("Entrepreneurship Development",           "3360504", "EE", 6, "DIPLOMA"),
]

# ---------------------------------------------------------------------------
# Diploma — Electronics & Communication (EC)
# ---------------------------------------------------------------------------
DIPLOMA_EC = [
    # Sem 2
    s("Electronic Components and Devices",      "3320601", "EC", 2, "DIPLOMA"),
    s("Digital Electronics Fundamentals",       "3320602", "EC", 2, "DIPLOMA"),
    s("Circuit Theory",                         "3320603", "EC", 2, "DIPLOMA"),
    s("Electronic Drawing and PCB",             "3320604", "EC", 2, "DIPLOMA"),
    # Sem 3
    s("Analog Electronics",                     "3330601", "EC", 3, "DIPLOMA"),
    s("Digital Communication Fundamentals",     "3330602", "EC", 3, "DIPLOMA"),
    s("Microprocessors",                        "3330603", "EC", 3, "DIPLOMA"),
    s("PCB Design",                             "3330604", "EC", 3, "DIPLOMA"),
    s("Electronic Instruments",                 "3330605", "EC", 3, "DIPLOMA"),
    # Sem 4
    s("Communication Systems",                  "3340601", "EC", 4, "DIPLOMA"),
    s("Embedded Systems",                       "3340602", "EC", 4, "DIPLOMA"),
    s("Fiber Optics Communication",             "3340603", "EC", 4, "DIPLOMA"),
    s("VLSI Design",                            "3340604", "EC", 4, "DIPLOMA"),
    s("Consumer Electronics",                   "3340605", "EC", 4, "DIPLOMA"),
    # Sem 5
    s("Mobile Communication",                   "3350601", "EC", 5, "DIPLOMA"),
    s("Satellite Communication",                "3350602", "EC", 5, "DIPLOMA"),
    s("Internet of Things",                     "3350603", "EC", 5, "DIPLOMA"),
    s("Industrial Electronics",                 "3350604", "EC", 5, "DIPLOMA"),
    s("Signal Processing",                      "3350605", "EC", 5, "DIPLOMA"),
    # Sem 6
    s("Advanced Communication Systems",         "3360601", "EC", 6, "DIPLOMA"),
    s("Robotics and Automation",                "3360602", "EC", 6, "DIPLOMA"),
    s("Project Work",                           "3360603", "EC", 6, "DIPLOMA"),
    s("Entrepreneurship Development",           "3360604", "EC", 6, "DIPLOMA"),
]

# ===========================================================================
# Master list
# ===========================================================================
ALL_SUBJECTS = (
    BE_COMMON
    + BE_CE
    + BE_IT
    + BE_ME
    + BE_CIVIL
    + BE_EE
    + BE_EC
    + BE_CHEM
    + BE_AUTO
    + DIPLOMA_COMMON
    + DIPLOMA_CO
    + DIPLOMA_ME
    + DIPLOMA_CIVIL
    + DIPLOMA_EE
    + DIPLOMA_EC
)


def main():
    import sys
    reset_mode = "--reset" in sys.argv

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print(f"Total subjects in seed: {len(ALL_SUBJECTS)}")

    if reset_mode:
        # Hard reset: delete child rows first to satisfy FK constraints, then subjects
        print("\n[RESET MODE] Clearing dependent tables first...")
        for table in ("study_materials", "exam_papers", "questions", "exam_predictions"):
            try:
                supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
                print(f"  Cleared {table}")
            except Exception as e:
                print(f"  Skip {table}: {e}")
        supabase.table("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print("  Cleared subjects")
        existing_keys: set = set()
    else:
        # Safe mode (default): fetch existing subjects, only insert missing ones
        print("Safe mode — fetching existing subjects...")
        res = supabase.table("subjects").select("code,branch,program").execute()
        existing_keys = {
            (r.get("code", ""), r.get("branch", ""), (r.get("program") or "BE").upper())
            for r in (res.data or [])
        }
        print(f"  {len(existing_keys)} subjects already in DB")

    to_insert = [
        sub for sub in ALL_SUBJECTS
        if (sub["code"], sub["branch"], sub["program"]) not in existing_keys
    ]
    print(f"  Inserting {len(to_insert)} new subjects...")

    batch_size = 50
    total = 0
    for i in range(0, len(to_insert), batch_size):
        batch = to_insert[i:i + batch_size]
        result = supabase.table("subjects").insert(batch).execute()
        total += len(result.data)
        print(f"  {total}/{len(to_insert)}...")

    print(f"\nDone. {total} subjects inserted.")
    from collections import Counter
    prog_branch = Counter((s["program"], s["branch"]) for s in to_insert)
    for (prog, branch), count in sorted(prog_branch.items()):
        print(f"  {prog:8} {branch:8} → {count} new")


if __name__ == "__main__":
    main()
