// Press Run (or Ctrl+Enter). This compiles and executes on the server.
// Whatever you type in the Input panel arrives on stdin.
//
// Include what you use. <bits/stdc++.h> is the competitive-programming
// habit, but it pulls in the whole standard library: measured on this
// backend it costs about 19s to build against about 5s for the three
// headers below.
#include <iostream>
#include <vector>

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
