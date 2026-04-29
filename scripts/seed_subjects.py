import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client

SUPABASE_URL = "https://opkfzdgopijxfosnozsv.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wa2Z6ZGdvcGlqeGZvc25venN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMwNzUxOCwiZXhwIjoyMDkyODgzNTE4fQ.xR8-2VWMdSmsthe4JBU9RvSgdv_9pVMQVkUmJNTxdaQ"

subjects = [
  {"name": "Effective Technical Communication", "code": "3130004", "branch": "CE", "semester": 3},
  {"name": "Probability and Statistics", "code": "3130006", "branch": "CE", "semester": 3},
  {"name": "Indian Constitution", "code": "3130007", "branch": "CE", "semester": 3},
  {"name": "Design Engineering 1A", "code": "3130008", "branch": "CE", "semester": 3},
  {"name": "Data Structures", "code": "3130702", "branch": "CE", "semester": 3},
  {"name": "Database Management Systems", "code": "3130703", "branch": "CE", "semester": 3},
  {"name": "Digital Fundamentals", "code": "3130704", "branch": "CE", "semester": 3},
  {"name": "Design Engineering 1B", "code": "3140005", "branch": "CE", "semester": 4},
  {"name": "Operating System", "code": "3140702", "branch": "CE", "semester": 4},
  {"name": "Object Oriented Programming I", "code": "3140705", "branch": "CE", "semester": 4},
  {"name": "Computer Organization and Architecture", "code": "3140707", "branch": "CE", "semester": 4},
  {"name": "Discrete Mathematics", "code": "3140708", "branch": "CE", "semester": 4},
  {"name": "Principles of Economics and Management", "code": "3140709", "branch": "CE", "semester": 4},
  {"name": "Design Engineering IIA", "code": "3150001", "branch": "CE", "semester": 5},
  {"name": "Analysis and Design of Algorithms", "code": "3150703", "branch": "CE", "semester": 5},
  {"name": "Professional Ethics", "code": "3150709", "branch": "CE", "semester": 5},
  {"name": "Computer Networks", "code": "3150710", "branch": "CE", "semester": 5},
  {"name": "Software Engineering", "code": "3150711", "branch": "CE", "semester": 5},
  {"name": "Computer Graphics", "code": "3150712", "branch": "CE", "semester": 5},
  {"name": "Python for Data Science", "code": "3150713", "branch": "CE", "semester": 5},
  {"name": "Cyber Security", "code": "3150714", "branch": "CE", "semester": 5},
  {"name": "Design Engineering IIB", "code": "3160001", "branch": "CE", "semester": 6},
  {"name": "Theory of Computation", "code": "3160704", "branch": "CE", "semester": 6},
  {"name": "Advanced Java Programming", "code": "3160707", "branch": "CE", "semester": 6},
  {"name": "Microprocessor and Interfacing", "code": "3160712", "branch": "CE", "semester": 6},
  {"name": "Web Programming", "code": "3160713", "branch": "CE", "semester": 6},
  {"name": "Data Mining", "code": "3160714", "branch": "CE", "semester": 6},
  {"name": "System Software", "code": "3160715", "branch": "CE", "semester": 6},
  {"name": "IOT and Applications", "code": "3160716", "branch": "CE", "semester": 6},
  {"name": "Data Visualization", "code": "3160717", "branch": "CE", "semester": 6},
  {"name": "Compiler Design", "code": "3170701", "branch": "CE", "semester": 7},
  {"name": "Mobile Computing and Wireless Communication", "code": "3170710", "branch": "CE", "semester": 7},
  {"name": "Artificial Intelligence", "code": "3170716", "branch": "CE", "semester": 7},
  {"name": "Cloud Computing", "code": "3170717", "branch": "CE", "semester": 7},
  {"name": "Information Retrieval", "code": "3170718", "branch": "CE", "semester": 7},
  {"name": "Distributed System", "code": "3170719", "branch": "CE", "semester": 7},
  {"name": "Information Security", "code": "3170720", "branch": "CE", "semester": 7},
  {"name": "Parallel and Distributed Computing", "code": "3170721", "branch": "CE", "semester": 7},
  {"name": "Big Data Analytics", "code": "3170722", "branch": "CE", "semester": 7},
  {"name": "Natural Language Processing", "code": "3170723", "branch": "CE", "semester": 7},
  {"name": "Machine Learning", "code": "3170724", "branch": "CE", "semester": 7},
  {"name": "Digital Forensics", "code": "3170725", "branch": "CE", "semester": 7},
  {"name": "Mobile Application Development", "code": "3170726", "branch": "CE", "semester": 7},
  # IT Branch
  {"name": "Effective Technical Communication", "code": "3130004", "branch": "IT", "semester": 3},
  {"name": "Probability and Statistics", "code": "3130006", "branch": "IT", "semester": 3},
  {"name": "Indian Constitution", "code": "3130007", "branch": "IT", "semester": 3},
  {"name": "Design Engineering 1A", "code": "3130008", "branch": "IT", "semester": 3},
  {"name": "Data Structures", "code": "3130702", "branch": "IT", "semester": 3},
  {"name": "Database Management Systems", "code": "3130703", "branch": "IT", "semester": 3},
  {"name": "Digital Fundamentals", "code": "3130704", "branch": "IT", "semester": 3},
  {"name": "Design Engineering 1B", "code": "3140005", "branch": "IT", "semester": 4},
  {"name": "Object Oriented Programming I", "code": "3140705", "branch": "IT", "semester": 4},
  {"name": "Computer Organization and Architecture", "code": "3140707", "branch": "IT", "semester": 4},
  {"name": "Discrete Mathematics", "code": "3140708", "branch": "IT", "semester": 4},
  {"name": "Principles of Economics and Management", "code": "3140709", "branch": "IT", "semester": 4},
  {"name": "Operating System and Virtualization", "code": "3141601", "branch": "IT", "semester": 4},
  {"name": "Design Engineering IIA", "code": "3150001", "branch": "IT", "semester": 5},
  {"name": "Analysis and Design of Algorithms", "code": "3150703", "branch": "IT", "semester": 5},
  {"name": "Professional Ethics", "code": "3150709", "branch": "IT", "semester": 5},
  {"name": "Computer Networks", "code": "3150710", "branch": "IT", "semester": 5},
  {"name": "Cyber Security", "code": "3150714", "branch": "IT", "semester": 5},
  {"name": "Object Oriented Analysis and Design", "code": "3151604", "branch": "IT", "semester": 5},
  {"name": "Formal Language and Automata Theory", "code": "3151605", "branch": "IT", "semester": 5},
  {"name": "Web Development", "code": "3151606", "branch": "IT", "semester": 5},
  {"name": "Computer Graphics and Visualization", "code": "3151607", "branch": "IT", "semester": 5},
  {"name": "Data Science", "code": "3151608", "branch": "IT", "semester": 5},
  {"name": "Design Engineering IIB", "code": "3160001", "branch": "IT", "semester": 6},
  {"name": "Image Processing", "code": "3161604", "branch": "IT", "semester": 6},
  {"name": "Software Engineering", "code": "3161605", "branch": "IT", "semester": 6},
  {"name": "Cryptography and Network Security", "code": "3161606", "branch": "IT", "semester": 6},
  {"name": "Big Data Analytics", "code": "3161607", "branch": "IT", "semester": 6},
  {"name": "Artificial Intelligence", "code": "3161608", "branch": "IT", "semester": 6},
  {"name": "Enterprise Application Development", "code": "3161609", "branch": "IT", "semester": 6},
  {"name": "Data Warehousing and Mining", "code": "3161610", "branch": "IT", "semester": 6},
  {"name": "Advanced Web Programming", "code": "3161611", "branch": "IT", "semester": 6},
  {"name": "Mobile Application Development", "code": "3161612", "branch": "IT", "semester": 6},
  {"name": "Data Analysis and Visualization", "code": "3161613", "branch": "IT", "semester": 6},
  {"name": "Information Retrieval", "code": "3170718", "branch": "IT", "semester": 7},
  {"name": "Internet of Things", "code": "3171108", "branch": "IT", "semester": 7},
  {"name": "Wireless Communication", "code": "3171608", "branch": "IT", "semester": 7},
  {"name": "Software Project Management", "code": "3171609", "branch": "IT", "semester": 7},
  {"name": "Agile Development and UI/UX Design", "code": "3171610", "branch": "IT", "semester": 7},
  {"name": "Graph Theory and Combinatorics", "code": "3171611", "branch": "IT", "semester": 7},
  {"name": "Virtual and Augmented Reality", "code": "3171612", "branch": "IT", "semester": 7},
  {"name": "Pattern Recognition", "code": "3171613", "branch": "IT", "semester": 7},
  {"name": "Computer Vision", "code": "3171614", "branch": "IT", "semester": 7},
  {"name": "Data Compression", "code": "3171615", "branch": "IT", "semester": 7},
  {"name": "Internetwork Security and Web Analytics", "code": "3171616", "branch": "IT", "semester": 7},
  {"name": "Applied Machine Learning", "code": "3171617", "branch": "IT", "semester": 7},
  {"name": "Blockchain", "code": "3171618", "branch": "IT", "semester": 7},
]

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Clear existing subjects first to avoid duplicates
    supabase.table("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("Cleared existing subjects.")

    # Insert in batches of 20
    batch_size = 20
    total = 0
    for i in range(0, len(subjects), batch_size):
        batch = subjects[i:i + batch_size]
        result = supabase.table("subjects").insert(batch).execute()
        total += len(result.data)
        print(f"Inserted {total}/{len(subjects)} subjects...")

    print(f"\nDone. {total} subjects inserted.")

if __name__ == "__main__":
    main()
