// Press Run (or Ctrl+Enter). This compiles and executes on the server.
// Whatever you type in the Input panel arrives on stdin.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    if (!(cin >> n)) n = 5;          // no input? fall back to 5

    vector<int> squares(n);
    for (int i = 0; i < n; i++) squares[i] = (i + 1) * (i + 1);

    for (int x : squares) cout << x << ' ';
    cout << '\n';
    return 0;
}
