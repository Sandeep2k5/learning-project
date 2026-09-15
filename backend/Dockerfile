FROM node:20-alpine
WORKDIR /app

# /api/run compiles C++, so the image needs a toolchain. musl-dev supplies
# the libc headers g++ cannot build without. This is the single biggest
# layer in the image — see learn/docker.md Lab 6.
RUN apk add --no-cache g++ musl-dev

# Precompile <bits/stdc++.h>. Every DSA solution includes it and parsing it
# costs seconds on Render's 0.1-CPU free instance.
#
# Rather than hunting for the real header and dropping a .gch beside it —
# which depends on the distro's include layout — own the path: a one-line
# prelude at a fixed location, precompiled next to itself. server.js passes
# `-include /opt/pch/prelude.hpp`, so the user's own include hits the guards
# and costs nothing. Flags here must match CXX_FLAGS in server.js or GCC
# discards the PCH without saying so.
RUN mkdir -p /opt/pch && echo '#include <bits/stdc++.h>' > /opt/pch/prelude.hpp && g++ -std=gnu++20 -O1 -Wall -x c++-header /opt/pch/prelude.hpp -o /opt/pch/prelude.hpp.gch && chmod -R a+r /opt/pch && ls -lh /opt/pch/prelude.hpp.gch

# Prove it. The build log should show the second compile far faster than a
# cold parse of the header would be.
RUN printf '#include <bits/stdc++.h>\nint main(){std::vector<int> v{1,2,3};std::cout<<v.size();}\n' > /tmp/pchtest.cpp && echo '--- without PCH ---' && time g++ -std=gnu++20 -O1 -Wall -pipe /tmp/pchtest.cpp -o /tmp/a.out && echo '--- with PCH ---' && time g++ -std=gnu++20 -O1 -Wall -pipe -include /opt/pch/prelude.hpp /tmp/pchtest.cpp -o /tmp/b.out && rm -f /tmp/pchtest.cpp /tmp/a.out /tmp/b.out

COPY package.json .
RUN npm install --omit=dev

COPY server.js store.js ./
COPY seed ./seed

# /api/run executes user-supplied code; do not hand it root.
USER node

EXPOSE 3000
CMD ["node", "server.js"]
