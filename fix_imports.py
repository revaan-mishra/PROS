with open('src/components/pros-dashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'import { useState, useEffect, useCallback } from "react";',
    'import { useState, useEffect, useCallback, useRef } from "react";\nimport { toast } from "sonner";'
)

with open('src/components/pros-dashboard.tsx', 'w') as f:
    f.write(content)
