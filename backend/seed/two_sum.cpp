// Classic DSA warm-up: indices of the two numbers adding to target.
// Input:  first line n and target, second line n numbers.
// Try:    4 9
//         2 7 11 15
#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

vector<int> twoSum(const vector<int>& nums, int target) {
    unordered_map<int, int> seen;    // value -> index
    for (int i = 0; i < (int)nums.size(); i++) {
        auto it = seen.find(target - nums[i]);
        if (it != seen.end()) return {it->second, i};
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, target;
    cin >> n >> target;
    vector<int> nums(n);
    for (int& x : nums) cin >> x;

    vector<int> ans = twoSum(nums, target);
    if (ans.empty()) cout << "no pair\n";
    else cout << ans[0] << ' ' << ans[1] << '\n';
    return 0;
}
