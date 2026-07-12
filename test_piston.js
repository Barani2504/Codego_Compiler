(async () => {
  let userCode = `
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.println("Sum is: " + (a + b));
        }
    }
}
`;

  // Preprocess Java code: replace java.util.Scanner with Scanner and remove imports
  userCode = userCode.replace(/import\s+java\.util\.Scanner;/g, '');
  userCode = userCode.replace(/\bjava\.util\.Scanner\b/g, 'Scanner');
  
  userCode += `
class Scanner {
    private final java.io.BufferedReader br;
    private java.util.StringTokenizer st;
    private String nextToken;

    public Scanner(java.io.InputStream is) {
        br = new java.io.BufferedReader(new java.io.InputStreamReader(is));
    }

    private boolean populateToken() {
        if (nextToken != null) return true;
        while (st == null || !st.hasMoreTokens()) {
            try {
                String line = br.readLine();
                if (line == null) return false;
                st = new java.util.StringTokenizer(line);
            } catch (Exception e) {
                return false;
            }
        }
        nextToken = st.nextToken();
        return true;
    }

    public boolean hasNext() {
        return populateToken();
    }

    public String next() {
        if (!populateToken()) throw new java.util.NoSuchElementException();
        String temp = nextToken;
        nextToken = null;
        return temp;
    }

    public int nextInt() {
        return Integer.parseInt(next());
    }

    public long nextLong() {
        return Long.parseLong(next());
    }

    public double nextDouble() {
        return Double.parseDouble(next());
    }

    public float nextFloat() {
        return Float.parseFloat(next());
    }

    public boolean hasNextInt() {
        if (!populateToken()) return false;
        try {
            Integer.parseInt(nextToken);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public boolean hasNextLong() {
        if (!populateToken()) return false;
        try {
            Long.parseLong(nextToken);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public boolean hasNextDouble() {
        if (!populateToken()) return false;
        try {
            Double.parseDouble(nextToken);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    public String nextLine() {
        if (nextToken != null) {
            String temp = nextToken;
            nextToken = null;
            StringBuilder sb = new StringBuilder(temp);
            if (st != null) {
                while (st.hasMoreTokens()) {
                    sb.append(" ").append(st.nextToken());
                }
            }
            return sb.toString();
        }
        st = null;
        try {
            return br.readLine();
        } catch (Exception e) {
            return null;
        }
    }

    public void close() {
        try {
            br.close();
        } catch (Exception e) {}
    }
}
`;

  const res = await fetch('http://127.0.0.1:2000/api/v2/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'java',
      version: '15.0.2',
      files: [{ name: 'Main.java', content: userCode }],
      stdin: '5 7\n',
      run_timeout: 10000,
      compile_timeout: 10000
    })
  });
  console.log(JSON.stringify(await res.json(), null, 2));
})();

