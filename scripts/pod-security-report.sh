#!/bin/bash
NAMESPACE="dev"
REPORT_DIR="./security-reports/pod-security"
mkdir -p "$REPORT_DIR"

OUTPUT="$REPORT_DIR/pod-security-report.txt"

echo "Generating Pod Security Standards report for namespace: $NAMESPACE"
echo ""

# 1. Labels del namespace
{
echo "=== Pod Security Standards Configuration ==="
echo "Namespace: $NAMESPACE"
echo ""
kubectl get namespace "$NAMESPACE" -o yaml | grep "pod-security"
echo ""
} > "$OUTPUT"

# 2. Revisar securityContext por pod
echo "=== Pod Security Context Verification ===" >> "$OUTPUT"
echo "" >> "$OUTPUT"

kubectl get pods -n "$NAMESPACE" -o json | jq -r '
.items[] |
"Pod: \(.metadata.name)
    Pod Security:
        runAsNonRoot: \(.spec.securityContext.runAsNonRoot // "NOT SET")
        runAsUser: \(.spec.securityContext.runAsUser // "NOT SET")
        fsGroup: \(.spec.securityContext.fsGroup // "NOT SET")
    Container Security:
        allowPrivilegeEscalation: \(.spec.containers[0].securityContext.allowPrivilegeEscalation // false)
        capabilities.drop: \(.spec.containers[0].securityContext.capabilities.drop // ["NOT SET"] | join(", "))
"' >> "$OUTPUT"

# 3. Resumen
TOTAL_PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers | wc -l)
COMPLIANT_PODS=$(kubectl get pods -n "$NAMESPACE" -o json | jq '[.items[] | select(.spec.securityContext.runAsNonRoot == true)] | length')

{
echo ""
echo "=== Compliance Summary ==="
echo ""
echo "Total pods: $TOTAL_PODS"
echo "Compliant pods: $COMPLIANT_PODS"
echo "Compliance rate: $((COMPLIANT_PODS * 100 / TOTAL_PODS))%"
} >> "$OUTPUT"

echo ""
echo "Report generated: $OUTPUT"
echo ""
cat "$OUTPUT"

